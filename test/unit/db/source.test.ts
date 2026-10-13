import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DatabaseNotConfigured, databaseSource } from "@/lib/db/source";

const POSTGRES_URL = "postgres://postgres.abcdefghijklmnopqrst:secret@db.example.com:6543/postgres";
const SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";

void describe("databaseSource", () => {
  void it("refuses to go on without POSTGRES_URL, naming it and nothing else", () => {
    for (const env of [{}, { POSTGRES_URL: "" }, { POSTGRES_URL: "  " }]) {
      assert.throws(
        () => databaseSource({ ...env, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL }),
        (error) =>
          error instanceof DatabaseNotConfigured &&
          error.message === "Missing required server environment: POSTGRES_URL",
      );
    }
  });

  void it("returns the database URL and the Supabase API URL it must agree with", () => {
    assert.deepEqual(
      databaseSource({ POSTGRES_URL: ` ${POSTGRES_URL} `, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL }),
      { postgresUrl: POSTGRES_URL, supabaseUrl: SUPABASE_URL },
    );
  });

  void it("leaves the project check to the database URL alone without a Supabase API URL", () => {
    assert.deepEqual(databaseSource({ POSTGRES_URL }), {
      postgresUrl: POSTGRES_URL,
      supabaseUrl: undefined,
    });
  });
});
