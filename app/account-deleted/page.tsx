import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function AccountDeletedPage() {
  return (
    <main className="min-h-screen bg-cloud px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="w-full max-w-xl rounded-lg border border-line bg-white p-8 text-center shadow-panel sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-mint text-pine">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-normal text-ink">Account deleted</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            Your Logs Assistant account deletion request has been completed in this frontend flow.
          </p>

          <div className="mt-8 rounded-md border border-line bg-slate-50 px-4 py-3 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-pine">
                <ShieldCheck size={17} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">What happens next</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  When the backend is connected, this page can be shown after the account data is removed or queued for deletion.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="focus-ring inline-flex h-10 items-center justify-center rounded-md bg-pine px-4 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Create a new account
            </Link>
            <Link
              href="/login"
              className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50"
            >
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
