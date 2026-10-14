/**
 * Whether the staff sign-in accepts the shared preview username and password
 * (PORTAL_PREVIEW_USERNAME / PORTAL_PREVIEW_PASSWORD) as the seeded admin.
 *
 * It fails closed. Vercel Preview and Development deployments get it from
 * VERCEL_ENV; anywhere else, such as local `next dev`, CI and a non-production
 * container, needs PORTAL_DEV_SIGN_IN=enabled. APP_ENV=production or
 * VERCEL_ENV=production turns it off whatever else is set, and an environment
 * that sets none of the three has it off.
 */
export function devSignInEnabled(): boolean {
  const appEnv = process.env.APP_ENV;
  const vercelEnv = process.env.VERCEL_ENV;
  if (appEnv === "production" || vercelEnv === "production") return false;
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  return process.env.PORTAL_DEV_SIGN_IN === "enabled";
}
