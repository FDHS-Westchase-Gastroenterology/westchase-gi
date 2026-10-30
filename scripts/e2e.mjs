#!/usr/bin/env node
/**
 * Local Playwright runs against the Preview branch database.
 *
 *   npm run e2e -- [--branch-env <path>] <playwright test arguments>
 *
 * Sets the hosted-branch marker and the e2e build directory, refuses to run while another
 * checkout's server holds :3100 (Playwright would reuse it and test that checkout's code), and
 * keeps the machine awake for the run. `--branch-env` loads the branch's variables from a file;
 * values already in the environment win. `e2e/harness/target-guard.ts` still decides whether
 * the database target is safe.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { holderIsThisCheckout, portHolders, repoRoot } from "./port-holder.mjs";

const HARNESS_PORT = 3100;
const BRANCH_ENV_FLAG = "--branch-env";

function splitArgs(argv) {
  const rest = [];
  let envFile;
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === BRANCH_ENV_FLAG) {
      index += 1;
      envFile = argv[index] ?? "";
    } else if (arg.startsWith(`${BRANCH_ENV_FLAG}=`)) {
      envFile = arg.slice(BRANCH_ENV_FLAG.length + 1);
    } else {
      rest.push(arg);
    }
  }
  return { envFile, rest };
}

function main(argv) {
  const { envFile, rest } = splitArgs(argv);
  if (envFile !== undefined) {
    const path = resolve(envFile);
    if (envFile === "" || !existsSync(path)) {
      console.error(`e2e: branch env file not found: ${envFile === "" ? "(no path given)" : path}`);
      return 1;
    }
    // Node keeps a variable that is already set, so the environment wins over the file.
    process.loadEnvFile(path);
  }
  process.env.SUPABASE_PREVIEW_BRANCH ??= "1";
  process.env.NEXT_DIST_DIR ??= ".next-e2e";

  const foreign = portHolders(HARNESS_PORT).filter((holder) => !holderIsThisCheckout(holder));
  if (foreign.length > 0) {
    for (const holder of foreign) {
      const where = holder.cwd ?? "an unknown directory";
      console.error(`e2e: port ${HARNESS_PORT} is held by pid ${holder.pid} in ${where}.`);
    }
    console.error(
      "e2e: Playwright would reuse that server and test another checkout's code. Stop it there, then rerun. Nothing was started.",
    );
    return 1;
  }

  const playwright = join(repoRoot, "node_modules", ".bin", "playwright");
  const [command, ...prefix] =
    process.platform === "darwin" ? ["caffeinate", "-i", playwright] : [playwright];
  const result = spawnSync(command, [...prefix, "test", ...rest], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`e2e: could not start Playwright: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

process.exit(main(process.argv));
