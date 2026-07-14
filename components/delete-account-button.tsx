"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { deleteAccount } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDeleteAccount() {
    setError(null);
    setLoading(true);
    const result = await deleteAccount();
    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? "Could not delete account.");
      return;
    }
    // Clear any client-side session state, then leave.
    await createClient().auth.signOut();
    router.push("/account-deleted");
    router.refresh();
  }

  return (
    <>
      <div className="p-5">
        <button
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose hover:bg-rose-50"
        >
          <Trash2 size={17} />
          Delete account
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4"
          onClick={() => !loading && setConfirmOpen(false)}
        >
          <section
            className="w-full max-w-md rounded-lg border border-line bg-white shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Delete account?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This soft-deletes your profile, projects, and conversations, then signs you out. This action
                  cannot be undone from the app.
                </p>
              </div>
              <button
                aria-label="Close confirmation"
                onClick={() => setConfirmOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>
            {error && (
              <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3 p-5">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className="focus-ring h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={loading}
                className="focus-ring h-10 rounded-md bg-rose px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Yes, delete account"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
