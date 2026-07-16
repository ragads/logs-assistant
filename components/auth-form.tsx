"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { loginSchema, signupSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";
type Errors = Record<string, string>;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  const title = isSignup ? "Create your workspace" : "Welcome back";
  const subtitle = isSignup
    ? "Start with secure access to your Supabase project logs."
    : "Sign in to continue monitoring connected Supabase projects.";

  const requirements = useMemo(
    () => ["Encrypted connections", "Filtered log views", "AI-assisted answers"],
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const result = isSignup ? signupSchema.safeParse(payload) : loginSchema.safeParse(payload);

    if (!result.success) {
      const nextErrors: Errors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    const supabase = createClient();

    if (isSignup) {
      const { name, email, password } = result.data as {
        name: string;
        email: string;
        password: string;
      };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      setLoading(false);
      if (error) {
        setFormError(error.message);
        return;
      }
      // If email confirmation is required, there is no session yet.
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { email, password } = result.data as { email: string; password: string };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setFormError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cloud px-6 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-lg border border-line bg-white shadow-panel lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-between bg-ink p-8 text-white sm:p-10">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-400 text-ink">
              <ShieldCheck size={22} />
            </div>
            <h1 className="mt-8 max-w-sm text-4xl font-semibold leading-tight tracking-normal">
              Logs Assistant
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
              A focused control room for Supabase logs, filters, and AI-assisted incident questions.
            </p>
          </div>
          <div className="mt-12 grid gap-3">
            {requirements.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/75">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-mint text-pine">
                <LockKeyhole size={21} />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-normal text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
              {isSignup && (
                <Field label="Name" name="name" placeholder="Enter a name" error={errors.name} />
              )}
              <Field label="Email" name="email" type="email" placeholder="you@company.com" error={errors.email} />
              <Field
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                error={errors.password}
              />
              {isSignup && (
                <Field
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  error={errors.confirmPassword}
                />
              )}
              {formError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose">
                  {formError}
                </div>
              )}
              {notice && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {notice}
                </div>
              )}
              <button
                disabled={loading}
                className="focus-ring mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              {isSignup ? "Already have an account?" : "New to Logs Assistant?"}{" "}
              <Link className="font-semibold text-pine hover:text-teal-800" href={isSignup ? "/login" : "/signup"}>
                {isSignup ? "Sign in" : "Create one"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  error
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-slate-400"
        name={name}
        type={type}
        placeholder={placeholder}
      />
      {error && <span className="text-xs font-medium text-rose">{error}</span>}
    </label>
  );
}
