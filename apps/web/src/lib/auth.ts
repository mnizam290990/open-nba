import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@opennba/db";
import { users, accounts, sessions, verificationTokens, auditLog } from "@opennba/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

async function writeAuditEvent(
  eventType: "USER_LOGIN" | "USER_LOGIN_FAILED" | "USER_LOGOUT" | "TOKEN_REFRESH",
  userId?: string
) {
  try {
    await db.insert(auditLog).values({
      eventType,
      userId: userId ?? null,
      metadata: { source: "auth" },
    });
  } catch {
    // Non-fatal — audit log failure must not break auth flow
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours
  },
  providers: [
    Credentials({
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          await writeAuditEvent("USER_LOGIN_FAILED");
          return null;
        }

        const { email, password } = parsed.data;
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user || !user.passwordHash) {
          await writeAuditEvent("USER_LOGIN_FAILED");
          return null;
        }
        if (!user.isActive) {
          await writeAuditEvent("USER_LOGIN_FAILED", user.id);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await writeAuditEvent("USER_LOGIN_FAILED", user.id);
          return null;
        }

        await writeAuditEvent("USER_LOGIN", user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.tenantId = (user as { tenantId: string }).tenantId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { tenantId: string }).tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const userId = (token as { sub?: string } | null)?.sub;
      await writeAuditEvent("USER_LOGOUT", userId);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
