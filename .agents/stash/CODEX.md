# Agent skills

Skills packaged here are discovered automatically from `.agents/skills` by agents running in this
repository, including agents working in a container that has nothing but this checkout. That is
why the vendor skills are copied in rather than referenced from a developer machine: a path
outside the repository does not exist for a cloud task.

Discovery is progressive. An agent sees each skill's name and description first and reads the full
`SKILL.md` only when it decides the skill applies, so the cost of keeping several here is small.

| Skill                              | Origin                                                                                                                                           | Declared version         | License          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ---------------- |
| `install-anti-slop`                | [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop)                                                                                      | Not declared             | MIT              |
| `react-doctor`                     | [react.doctor](https://www.react.doctor), already in this repository                                                                             | 1.2.0                    | Not declared     |
| `supabase`                         | [supabase/agent-skills](https://github.com/supabase/agent-skills)                                                                                | 0.1.2                    | Vendor-published |
| `supabase-postgres-best-practices` | [supabase/agent-skills](https://github.com/supabase/agent-skills)                                                                                | 1.1.1                    | MIT              |
| `vercel-react-best-practices`      | Vercel Engineering                                                                                                                               | 1.0.0                    | MIT              |
| `wgi-supabase-branching`           | Project-authored                                                                                                                                 | 1.0.0                    | Repository       |
| `writing-quality`                  | [vercel-labs/eve-software-factory-template](https://github.com/vercel-labs/eve-software-factory-template/tree/main/agent/skills/writing-quality) | Not declared (`4cb890e`) | MIT              |
| `shadcn`                           | [shadcn-ui/ui](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn)                                                                          | Not declared (`683a5a9`) | MIT              |

## Precedence

Vendored skills are advisory. They were written for the general case and know nothing about this
practice, so they rank below the repository's own rules:

1. `AGENTS.md` hard rules — provider credentials, five locales, PHI posture, intake and portal
   invariants. These win outright.
2. The framework guidance at the top of `AGENTS.md`. This project runs a Next.js version whose
   APIs and conventions differ from what a general best-practices document assumes. Check
   `node_modules/next/dist/docs/` before acting on any framework recommendation from a vendored
   skill, and prefer what the installed version documents.
3. `ARCHITECTURE.md` for where a change belongs and `CONTRIBUTING.md` for how to verify it.
4. A project-authored workflow skill.
5. The vendored skill.

A vendored skill that contradicts a hard rule is wrong for this repository, not a reason to
revisit the rule. Concrete standing example: the `shadcn` skill's preset and theming workflow
would happily overwrite this repository's committed brand palette; the palette-protection and
reconciliation rules in [`AGENTS.md`](../../AGENTS.md#shadcnui) outrank it, and a preset whose
palette reaches a commit is a failed loop.

The `shadcn` skill also has a machine-global mirror at `~/.agents/skills/shadcn` for agents
working outside this checkout. The committed copy is canonical; refresh both together.

## Updating vendor skills

Re-copy the whole directory from upstream and record the new version in the table above. Do not
hand-edit vendored content: a local edit is invisible to the next person who refreshes the skill,
and it silently forks a document that claims to be the vendor's.

Project-authored workflow skills are edited in place with the repository docs they operationalize.
