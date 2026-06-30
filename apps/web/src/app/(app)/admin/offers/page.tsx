"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, AlertTriangle, Check, X } from "lucide-react";

type OfferType = "SAMPLE" | "DETAIL_AID" | "REPRINTS" | "CME_INVITE" | "DIGITAL_ASSET";
type TherapyArea = "CARDIOLOGY" | "ONCOLOGY" | "DIABETOLOGY" | "NEUROLOGY" | "RESPIRATORY";

type Offer = {
  offerId: string;
  type: OfferType;
  therapyArea: TherapyArea;
  title: string;
  description: string | null;
  isActive: boolean;
  expiryDate: string | null;
  assetUrl: string | null;
  createdAt: string;
};

type OfferDraft = {
  type: OfferType;
  therapyArea: TherapyArea;
  title: string;
  description: string;
  assetUrl: string;
  expiryDate: string;
};

const OFFER_TYPES: OfferType[] = ["SAMPLE", "DETAIL_AID", "REPRINTS", "CME_INVITE", "DIGITAL_ASSET"];
const THERAPY_AREAS: TherapyArea[] = ["CARDIOLOGY", "ONCOLOGY", "DIABETOLOGY", "NEUROLOGY", "RESPIRATORY"];

const EMPTY_DRAFT: OfferDraft = {
  type: "SAMPLE",
  therapyArea: "CARDIOLOGY",
  title: "",
  description: "",
  assetUrl: "",
  expiryDate: "",
};

function OfferBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground line-through"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function OfferFormModal({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: OfferDraft;
  onSave: (draft: OfferDraft) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState<OfferDraft>(initial);

  function set<K extends keyof OfferDraft>(k: K, v: OfferDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  return (
    <div
      data-testid="offer-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-semibold">
            {initial.title ? "Edit Offer" : "New Offer"}
          </h3>
          <button onClick={onCancel} aria-label="Close modal" className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="offer-title">
              Title
            </label>
            <input
              id="offer-title"
              data-testid="offer-title-input"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. CARDI-FORTE Sample Pack"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="offer-type">
                Type
              </label>
              <select
                id="offer-type"
                data-testid="offer-type-select"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={draft.type}
                onChange={(e) => set("type", e.target.value as OfferType)}
              >
                {OFFER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="offer-therapy">
                Therapy Area
              </label>
              <select
                id="offer-therapy"
                data-testid="offer-therapy-select"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={draft.therapyArea}
                onChange={(e) => set("therapyArea", e.target.value as TherapyArea)}
              >
                {THERAPY_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="offer-description">
              Description
            </label>
            <textarea
              id="offer-description"
              data-testid="offer-description-input"
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description for MRs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="offer-asset-url">
                Asset URL
              </label>
              <input
                id="offer-asset-url"
                data-testid="offer-asset-url-input"
                type="url"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={draft.assetUrl}
                onChange={(e) => set("assetUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="offer-expiry">
                Expiry Date
              </label>
              <input
                id="offer-expiry"
                data-testid="offer-expiry-input"
                type="date"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={draft.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-5 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            data-testid="offer-save-btn"
            onClick={() => onSave(draft)}
            disabled={saving || !draft.title.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />}
            {saving ? "Saving…" : "Save Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadOffers() {
    try {
      const res = await fetch("/api/v1/admin/offers");
      const json = await res.json();
      setOffers(json.data?.data ?? []);
    } catch {
      setFetchError("Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOffers(); }, []);

  function openCreate() {
    setEditingOffer(null);
    setSaveError(null);
    setShowModal(true);
  }

  function openEdit(offer: Offer) {
    setEditingOffer(offer);
    setSaveError(null);
    setShowModal(true);
  }

  async function handleSave(draft: OfferDraft) {
    setSaving(true);
    setSaveError(null);

    const body = {
      ...draft,
      assetUrl: draft.assetUrl || null,
      expiryDate: draft.expiryDate
        ? new Date(draft.expiryDate).toISOString()
        : null,
    };

    try {
      const res = editingOffer
        ? await fetch(`/api/v1/admin/offers/${editingOffer.offerId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/v1/admin/offers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const json = await res.json();
        setSaveError(json.error ?? "Failed to save offer.");
        return;
      }

      setShowModal(false);
      await loadOffers();
    } catch {
      setSaveError("Network error — could not reach server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(offer: Offer) {
    if (!confirm(`Deactivate "${offer.title}"? This cannot be undone.`)) return;
    setDeletingId(offer.offerId);

    try {
      const res = await fetch(`/api/v1/admin/offers/${offer.offerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Failed to deactivate offer.");
        return;
      }
      await loadOffers();
    } catch {
      alert("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  const initialDraft: OfferDraft = editingOffer
    ? {
        type: editingOffer.type,
        therapyArea: editingOffer.therapyArea,
        title: editingOffer.title,
        description: editingOffer.description ?? "",
        assetUrl: editingOffer.assetUrl ?? "",
        expiryDate: editingOffer.expiryDate
          ? editingOffer.expiryDate.slice(0, 10)
          : "",
      }
    : EMPTY_DRAFT;

  return (
    <>
      {showModal && (
        <OfferFormModal
          initial={initialDraft}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
          saving={saving}
          error={saveError}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            data-testid="offers-back-button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors"
            aria-label="Back to admin console"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 data-testid="offers-heading" className="text-xl font-bold">
              Offer Catalog
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage offers available to MRs during NBA interactions
            </p>
          </div>
          <button
            data-testid="new-offer-btn"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Offer
          </button>
        </div>

        {loading && (
          <div data-testid="offers-loading" className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading offers…
          </div>
        )}

        {fetchError && !loading && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {fetchError}
          </div>
        )}

        {!loading && !fetchError && (
          <section data-testid="offers-table" className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">
                All Offers ({offers.length})
              </h2>
            </div>

            {offers.length === 0 ? (
              <div
                data-testid="offers-empty"
                className="px-5 py-8 text-center text-sm text-muted-foreground"
              >
                No offers yet. Click "New Offer" to add one.
              </div>
            ) : (
              <ul>
                {offers.map((offer) => (
                  <li
                    key={offer.offerId}
                    data-testid="offer-row"
                    className="flex items-center justify-between border-b px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{offer.title}</p>
                        <OfferBadge active={offer.isActive} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {offer.type.replace(/_/g, " ")} · {offer.therapyArea}
                        {offer.expiryDate && ` · Expires ${new Date(offer.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      </p>
                      {offer.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{offer.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        data-testid="offer-edit-btn"
                        onClick={() => openEdit(offer)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors"
                        aria-label={`Edit ${offer.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {offer.isActive && (
                        <button
                          data-testid="offer-delete-btn"
                          onClick={() => handleDelete(offer)}
                          disabled={deletingId === offer.offerId}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          aria-label={`Deactivate ${offer.title}`}
                        >
                          {deletingId === offer.offerId ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-red-300 border-t-red-600" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
