/**
 * Who holds a local TCP port, and whether that process belongs to this checkout.
 *
 * `playwright.config.ts` reuses any server that answers on :3100, and `dev:mission` replaces
 * whatever listens there. With several worktrees on one machine the holder can be another
 * checkout's server, so both callers ask here before they run.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout : "";
}

function fieldLines(output, prefix) {
  return output
    .split("\n")
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length));
}

/** The checkout a directory belongs to; the directory itself when it is outside git. */
export function checkoutOf(directory) {
  const top = run("git", ["-C", directory, "rev-parse", "--show-toplevel"]).trim();
  return top === "" ? directory : top;
}

/** Processes listening on the port, each with its working directory when lsof reports one. */
export function portHolders(port) {
  const pids = fieldLines(run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fp"]), "p");
  return [...new Set(pids)].map((pid) => {
    const [cwd] = fieldLines(run("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"]), "n");
    return { pid: Number(pid), cwd };
  });
}

/** A holder whose working directory is unknown counts as another checkout. */
export function holderIsThisCheckout(holder) {
  return holder.cwd !== undefined && checkoutOf(holder.cwd) === checkoutOf(repoRoot);
}
