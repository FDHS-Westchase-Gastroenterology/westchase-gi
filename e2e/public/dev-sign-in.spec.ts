import { test, expect } from "@playwright/test";

import { devSignInEnabled } from "../../src/lib/portal/dev-sign-in";

/* Dev sign-in turns the shared preview username and password into the seeded
   admin's session, so it must stay off anywhere not explicitly marked as a
   preview or development environment: an AWS task sets none of the Vercel
   variables. Each row sets all three variables (undefined removes one) and
   states the decision as a literal. */

const VARIABLES = ["APP_ENV", "PORTAL_DEV_SIGN_IN", "VERCEL_ENV"] as const;
type Variable = (typeof VARIABLES)[number];

interface DecisionRow {
  readonly appEnv?: string;
  readonly flag?: string;
  readonly vercelEnv?: string;
  readonly enabled: boolean;
}

const ROWS: readonly DecisionRow[] = [
  { enabled: false },
  { flag: "enabled", enabled: true },
  { flag: "Enabled", enabled: false },
  { flag: "true", enabled: false },
  { flag: "1", enabled: false },
  { vercelEnv: "preview", enabled: true },
  { vercelEnv: "development", enabled: true },
  { vercelEnv: "production", enabled: false },
  { vercelEnv: "production", flag: "enabled", enabled: false },
  { appEnv: "production", flag: "enabled", enabled: false },
  { appEnv: "production", vercelEnv: "preview", enabled: false },
  { appEnv: "staging", flag: "enabled", enabled: true },
  { appEnv: "staging", enabled: false },
];

function setVariable(name: Variable, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function decisionWith(row: DecisionRow): boolean {
  const saved = VARIABLES.map((name) => [name, process.env[name]] as const);
  try {
    setVariable("APP_ENV", row.appEnv);
    setVariable("PORTAL_DEV_SIGN_IN", row.flag);
    setVariable("VERCEL_ENV", row.vercelEnv);
    return devSignInEnabled();
  } finally {
    for (const [name, value] of saved) setVariable(name, value);
  }
}

function rowTitle(row: DecisionRow): string {
  const set = [
    row.appEnv === undefined ? null : `APP_ENV=${row.appEnv}`,
    row.flag === undefined ? null : `PORTAL_DEV_SIGN_IN=${row.flag}`,
    row.vercelEnv === undefined ? null : `VERCEL_ENV=${row.vercelEnv}`,
  ].filter((entry) => entry !== null);
  return `${set.length === 0 ? "nothing set" : set.join(", ")} → ${row.enabled ? "on" : "off"}`;
}

test.describe("dev sign-in fails closed", () => {
  for (const row of ROWS) {
    test(rowTitle(row), () => {
      expect(decisionWith(row)).toBe(row.enabled);
    });
  }
});
