import { Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SettingsProfileForm } from "@/components/settings-profile-form";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const name = (profile?.name as string) || (user?.user_metadata?.name as string) || "";
  const email = (profile?.email as string) || user?.email || "";

  return (
    <AppShell title="Settings" subtitle="Manage profile details and account security.">
      <div className="grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-line bg-white">
          <div className="border-b border-line p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mint text-pine">
                <UserRound size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">Profile</h2>
                <p className="text-sm text-slate-500">Only the profile name is editable here.</p>
              </div>
            </div>
          </div>
          <SettingsProfileForm name={name} email={email} />
        </section>

        <section className="rounded-lg border border-line bg-white">
          <div className="border-b border-line p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                <Trash2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">Account</h2>
                <p className="text-sm text-slate-500">Delete account requires confirmation.</p>
              </div>
            </div>
          </div>
          <DeleteAccountButton />
        </section>
      </div>
    </AppShell>
  );
}
