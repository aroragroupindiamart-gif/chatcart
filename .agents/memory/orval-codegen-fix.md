---
name: Orval codegen duplicate export fix
description: Orval regenerates lib/api-zod/src/index.ts with both Zod schemas and TS type exports; patch the codegen script to overwrite it after orval runs.
---

## Rule
The orval `zod` client generates `lib/api-zod/src/index.ts` that exports both `./generated/api` (Zod schemas) AND `./generated/types` (TypeScript interfaces) — causing `TS2308: Module has already exported a member` errors when names collide.

**Why:** Orval's `mode: "split"` generates a barrel index.ts including all outputs. When both `client: "zod"` and `schemas: { type: "typescript" }` are configured, the same schema names appear in both `api.ts` and `types/`.

**How to apply:** Two fixes applied:
1. Removed `schemas: { path: "generated/types", type: "typescript" }` from the zod orval config — this prevents generating duplicate TS interfaces alongside Zod schemas.
2. Added a patch step in `lib/api-spec/package.json` codegen script: `&& printf 'export * from "./generated/api";\n' > ../api-zod/src/index.ts` — runs after orval to overwrite the regenerated index.ts.

File: `lib/api-spec/package.json` codegen script, `lib/api-spec/orval.config.ts`.
