import { SettingsPaneLinks } from "@/app/admin/(portal)/settings-nav";

/* The Settings window (issue #352). From 60rem the portal sidebar becomes
   Settings' own list (settings-nav.tsx); below it the panes sit in a row of
   links here. Each pane renders its own header and actions. */

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SettingsPaneLinks />
      {children}
    </>
  );
}
