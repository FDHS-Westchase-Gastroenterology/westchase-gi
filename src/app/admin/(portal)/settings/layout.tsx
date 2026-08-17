import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";

import { SettingsTabs } from "./settings-tabs";

// Settings is one primary-nav destination with two sub-pages: the
// Frequent staff-facing configuration (notifications, access) and the
// Rarely touched website custody record. The shared heading and the
// Quiet tab row live here; each sub-page describes its own content.

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section aria-labelledby="settings-heading">
      <PortalPageHeader
        title={<span id="settings-heading">Settings</span>}
        description="Manage the people and systems around the appointment-request workflow. Changes here are infrequent and stay out of the daily work stack."
      />
      <SettingsTabs />
      <div className="mt-6 sm:mt-8">{children}</div>
    </section>
  );
}
