/* An in-memory stand-in for the Supabase query builder, for unit tests of
   reads that filter, order, page, and count. It answers `select`, `eq`,
   `in`, `order`, `range`, `maybeSingle`, and `await` from plain table rows
   and records every query it was asked, so a test can assert both the
   result and how it was read.

   Options:
   - maxRows: per table, the most rows one response returns, like PostgREST
     `max_rows`.
   - fail(call): return true to answer that query with an error.
   - countless: answer `count: "exact"` selects without a count.
   - extraCount: add this to every exact count, so a read comes up short.
   - ignoreFilters: tables whose filters are ignored, as if the database
     returned rows it should not have. */

function compareBy(orders) {
  return (a, b) => {
    for (const { column, ascending } of orders) {
      if (a[column] === b[column]) continue;
      const order = a[column] < b[column] ? -1 : 1;
      return ascending ? order : -order;
    }
    return 0;
  };
}

export function fakePostgrest(tables, options = {}) {
  const {
    maxRows = {},
    fail = () => false,
    countless = false,
    extraCount = 0,
    ignoreFilters = [],
  } = options;
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, columns: "", count: null, filters: [], orders: [], range: null };
      calls.push(call);
      function run(single) {
        if (fail(call)) return { data: null, error: { code: "READ_FAILED" }, count: null };
        const filters = ignoreFilters.includes(table) ? [] : call.filters;
        const matched = (tables[table] ?? [])
          .filter((row) => filters.every(({ column, values }) => values.includes(row[column])))
          .toSorted(compareBy(call.orders));
        const ranged =
          call.range === null ? matched : matched.slice(call.range[0], call.range[1] + 1);
        const columns = call.columns.split(",").map((column) => column.trim());
        const project = (row) => Object.fromEntries(columns.map((key) => [key, row[key] ?? null]));
        const rows = ranged.slice(0, maxRows[table] ?? ranged.length).map(project);
        if (single) return { data: rows.at(0) ?? null, error: null };
        const count = call.count === "exact" && !countless ? matched.length + extraCount : null;
        return { data: rows, error: null, count };
      }
      const query = {
        select(columns, selectOptions) {
          call.columns = columns;
          call.count = selectOptions?.count ?? null;
          return query;
        },
        eq(column, value) {
          call.filters.push({ column, values: [value] });
          return query;
        },
        in(column, values) {
          call.filters.push({ column, values: [...values] });
          return query;
        },
        order(column, orderOptions) {
          call.orders.push({ column, ascending: orderOptions?.ascending ?? true });
          return query;
        },
        range(from, to) {
          call.range = [from, to];
          return query;
        },
        maybeSingle() {
          return Promise.resolve(run(true));
        },
        then(resolve, reject) {
          return Promise.resolve(run(false)).then(resolve, reject);
        },
      };
      return query;
    },
  };
}
