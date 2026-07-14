"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateName } from "@/app/actions/profile";

export function SettingsProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    const result = await updateName(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-5">
      <Field label="Name" name="name" defaultValue={name} required />
      <Field label="Email" defaultValue={email} type="email" disabled />
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">{error}</div>
      )}
      {saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Name updated.
        </div>
      )}
      <button
        disabled={loading}
        className="focus-ring inline-flex h-10 w-fit items-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={17} />
        {loading ? "Saving..." : "Save name"}
      </button>
    </form>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        className="focus-ring h-10 rounded-md border border-line px-3 text-sm text-ink placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        {...props}
      />
    </label>
  );
}
