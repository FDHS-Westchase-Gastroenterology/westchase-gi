import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** Includes uncommitted application source; never reads environment files. */
export function capturePerformanceSource() {
  const files = execFileSync(
    "git",
    [
      "-c",
      "core.fsmonitor=false",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "src",
      "package-lock.json",
      "next.config.ts",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .sort();
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update("\0").update(readFileSync(file)).update("\0");
  return {
    baseSha: execFileSync("git", ["-c", "core.fsmonitor=false", "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    applicationSha256: hash.digest("hex"),
    buildId: readFileSync(".next/BUILD_ID", "utf8").trim(),
    node: process.version,
  };
}
