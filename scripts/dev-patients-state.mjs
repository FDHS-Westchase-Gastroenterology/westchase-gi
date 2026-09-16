import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

import { digest } from "./dev-patients-store.mjs";

export function seedState(directory, target) {
  const base = join(directory, "dev-patients", digest(target.url).slice(0, 24));
  const lockPath = `${base}.lock`;
  const journalPath = `${base}.json`;
  const receiptPath = `${base}.verified.json`;
  const write = (path, value) => {
    mkdirSync(join(directory, "dev-patients"), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${String(process.pid)}.tmp`;
    writeFileSync(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx", flush: true });
    renameSync(temporary, path);
    const parent = openSync(join(directory, "dev-patients"), "r");
    try {
      fsyncSync(parent);
    } finally {
      closeSync(parent);
    }
  };
  return {
    journalPath,
    lockPath,
    pending: () => existsSync(journalPath),
    read: () => JSON.parse(readFileSync(journalPath, "utf8")),
    save: (value) => write(journalPath, value),
    clear: () => unlinkSync(journalPath),
    receipt: () => (existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, "utf8")) : null),
    saveReceipt: (value) => write(receiptPath, value),
    acquire(recover = false) {
      mkdirSync(join(directory, "dev-patients"), { recursive: true, mode: 0o700 });
      if (recover && existsSync(lockPath)) {
        const owner = JSON.parse(readFileSync(lockPath, "utf8"));
        if (owner.host !== hostname() || !Number.isInteger(owner.pid) || owner.pid <= 0)
          throw new Error("Lock owner cannot be verified");
        try {
          process.kill(owner.pid, 0);
          throw new Error("Another fixture operation is running");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
        unlinkSync(lockPath);
      }
      let file;
      try {
        file = openSync(lockPath, "wx", 0o600);
      } catch (error) {
        if (error.code === "EEXIST")
          throw new Error(`Fixture operation locked: ${lockPath}. Inspect before using recover.`);
        throw error;
      }
      writeFileSync(
        file,
        JSON.stringify({ pid: process.pid, host: hostname(), started: new Date().toISOString() }),
      );
      closeSync(file);
      return () => unlinkSync(lockPath);
    },
  };
}
