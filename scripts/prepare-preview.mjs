import { spawnSync } from "node:child_process"

if (process.env.VERCEL_ENV !== "preview") process.exit(0)

const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
let url
try {
  url = new URL(value)
} catch {
  throw new Error("Vercel Preview requires a valid branch Supabase URL before build")
}

const suffix = ".supabase.co"
const ref = url.hostname.endsWith(suffix)
  ? url.hostname.slice(0, -suffix.length)
  : ""
if (url.protocol !== "https:" || !ref) {
  throw new Error("Vercel Preview requires a hosted Supabase branch before build")
}

const result = spawnSync(
  process.execPath,
  ["scripts/seed-portal.mjs", "--target", "preview"],
  {
    env: { ...process.env, SUPABASE_PREVIEW_PROJECT_REF: ref },
    stdio: "inherit",
  },
)
if (result.status !== 0) {
  throw new Error("Vercel Preview staff seed failed; refusing an inconsistent build")
}
