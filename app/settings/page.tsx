import { SettingsForm } from "@/components/lab/settings-form";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-ds-heading-3">Settings</h1>
      <p className="mt-1 mb-8 text-ds-body-sm text-text-muted">Saved on this device. New sessions use these values; sessions already started keep theirs.</p>
      <SettingsForm />
    </div>
  );
}
