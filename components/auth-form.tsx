"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema, signupSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { AuthIllustration } from "@/components/auth-illustration";

type Mode = "login" | "signup";
type Errors = Record<string, string>;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  const title = isSignup ? "Create account" : "Sign in";
  const switchPrompt = isSignup ? "Already have an account?" : "Don't have an account?";
  const switchLabel = isSignup ? "Sign in" : "Create now";
  const switchHref = isSignup ? "/login" : "/signup";

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
    <main className="flex min-h-screen items-center justify-center bg-[#DCEEFC] px-4 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[28px] bg-[#050d16] shadow-[0_30px_80px_rgba(8,30,45,0.35)] lg:grid-cols-2">
        <section className="flex flex-col justify-center px-8 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <h1 className="text-4xl font-bold tracking-tight text-white">{title}</h1>
            <p className="mt-3 text-sm text-white/60">
              {switchPrompt}{" "}
              <Link className="font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200" href={switchHref}>
                {switchLabel}
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
              {isSignup && (
                <Field label="Name" name="name" placeholder="Enter your name" error={errors.name} />
              )}
              <Field label="Email" name="email" type="email" placeholder="example@gmail.com" error={errors.email} />
              <PasswordField
                label="Password"
                name="password"
                placeholder="Enter your password"
                error={errors.password}
              />
              {isSignup && (
                <PasswordField
                  label="Confirm password"
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  error={errors.confirmPassword}
                />
              )}

              {formError && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
                  {formError}
                </div>
              )}
              {notice && (
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-200">
                  {notice}
                </div>
              )}

              <button
                disabled={loading}
                className="mt-2 h-12 rounded-xl bg-gradient-to-r from-[#2F5BFF] to-[#3E6BFF] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(47,91,255,0.35)] transition hover:from-[#2547d6] hover:to-[#3357e0] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#050d16] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : title}
              </button>
            </form>
          </div>
        </section>

        <section className="hidden lg:block">
          <AuthIllustration />
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
    <label className="grid gap-2 text-sm font-medium text-white/80">
      {label}
      <input
        className="h-12 rounded-xl border-none bg-white px-4 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        name={name}
        type={type}
        placeholder={placeholder}
      />
      {error && <span className="text-xs font-medium text-rose-300">{error}</span>}
    </label>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  error
}: {
  label: string;
  name: string;
  placeholder: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm font-medium text-white/80">
      {label}
      <div className="relative">
        <input
          className="h-12 w-full rounded-xl border-none bg-white pl-4 pr-11 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <span className="text-xs font-medium text-rose-300">{error}</span>}
    </label>
  );
}
