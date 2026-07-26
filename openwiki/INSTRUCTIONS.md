# OpenWiki refresh contract

Generate or update a concise code wiki for this standalone public repository
from the current checked-out source only.

- Treat `README.md`, `AGENTS.md`, `GOVERNANCE.md`, `PRODUCT.md`, `DESIGN.md`,
  `docs/PORTAL-OPS.md`, `docs/PORTAL-PRODUCT.md`, and
  `docs/INTEGRATION-ACTIVATION.md` as authoritative.
- Cover quickstart, architecture, workflows, domain concepts, data/security,
  integrations, operations/governance, testing, and a change-oriented source
  map.
- Preserve current lifecycle, custody, strict branch-protection, delivery, and
  no-hosted-database testing boundaries. Never infer activation or acceptance
  from schema or code alone.
- Do not inspect or mention parent directories, outer engagement records, local
  secret files, secret values, or private history.
- Do not create or enable scheduled automation, duplicate instructions into
  `CLAUDE.md`, or alter application source. The bounded OpenWiki pointer in
  `AGENTS.md` and reviewed files under `openwiki/` are the only intended
  outputs.
- When generated prose conflicts with current source or verified operations
  docs, the source wins; correct or omit the claim before merge.
