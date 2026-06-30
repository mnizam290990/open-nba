export function HCPCardSkeleton() {
  return (
    <div
      data-testid="hcp-card-skeleton"
      className="animate-pulse rounded-xl border bg-card p-4"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-5 w-14 rounded-full bg-muted" />
          </div>
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
        <div className="h-12 w-12 rounded-lg bg-muted" />
      </div>
      <div className="mt-3 flex gap-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-28 rounded-lg bg-muted" />
        <div className="h-8 w-20 rounded-lg bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
        <div className="h-8 w-16 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function HCPFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <HCPCardSkeleton key={i} />
      ))}
    </div>
  );
}
