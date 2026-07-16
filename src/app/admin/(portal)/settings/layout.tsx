import { SettingsTabs } from "./settings-tabs";

// Settings is one primary-nav destination with two sub-pages: the
// frequent staff-facing configuration (notifications, access) and the
// rarely touched website custody record. The shared heading and the
// quiet tab row live here; each sub-page describes its own content.

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="settings-heading">
      <h1
        id="settings-heading"
        className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
      >
        Settings
      </h1>
      <SettingsTabs />
      <div className="mt-8">{children}</div>
    </section>
  );
}
