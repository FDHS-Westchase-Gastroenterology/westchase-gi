import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DatabaseNotConfigured, databaseSource } from "@/lib/db/source";

const POSTGRES_URL = "postgres://postgres.abcdefghijklmnopqrst:secret@db.example.com:6543/postgres";
const SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
/* Anything shaped like a URL (`scheme://`) or a credential pair (`user:password@host`). */
const CONNECTION_STRING = /[a-z][a-z0-9+.-]*:\/\/|[^\s:@]+:[^\s@]+@/iu;

void describe("databaseSource", () => {
  void it("refuses to go on without POSTGRES_URL, naming it and nothing else", () => {
    // The neighbors carry URLs, so a message that echoed the environment would show one.
    const neighbors = {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      POSTGRES_URL_NON_POOLING: POSTGRES_URL,
    };
    for (const env of [{}, { POSTGRES_URL: "" }, { POSTGRES_URL: "  " }]) {
      assert.throws(
        () => databaseSource({ ...neighbors, ...env }),
        (error) => {
          assert.ok(error instanceof DatabaseNotConfigured);
          // What `database()` logs, as `[db] <message>`.
          assert.equal(error.message, "POSTGRES_URL is not set");
          assert.match(error.message, /\bPOSTGRES_URL\b/u);
          assert.doesNotMatch(error.message, CONNECTION_STRING);
          return true;
        },
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
