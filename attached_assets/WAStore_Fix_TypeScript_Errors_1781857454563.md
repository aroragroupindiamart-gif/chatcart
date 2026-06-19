# WAStore Builder — Fix Pre-existing TypeScript Errors

Context: The dashboard has pre-existing TypeScript errors that have accumulated across earlier build sessions. These need to be resolved before adding more features on top, since unresolved type errors compound — each new feature built against an already-broken type contract makes the eventual cleanup harder and increases the risk of runtime bugs that TypeScript would otherwise have caught.

## Required actions

1. Run the TypeScript compiler/checker across the full codebase (both frontend and backend, e.g. `tsc --noEmit`) and list every current error: file, line number, and the error message.
2. Fix each one properly — meaning fix the actual underlying type mismatch, missing type, or incorrect assumption. Do NOT silence errors by adding `@ts-ignore`, `as any`, or loosening `tsconfig.json` strictness settings just to make the count go to zero. If a genuine `any` is unavoidable in a specific spot, explain why and keep it narrowly scoped, not a blanket suppression.
3. After fixing, re-run the type check and confirm zero errors remain.
4. If any of these errors point to an actual functional bug (not just a type annotation issue — e.g. a function that could receive `undefined` and crash, a mismatched API response shape between frontend and backend), flag that specifically and explain what real-world bug it could have caused, since that's more important than the type error itself.

## Proof required

1. Show the full list of errors that existed before this fix (file + line + message).
2. Show the type-check output after the fix, confirming zero errors.
3. Call out specifically if any fixed error represented a real functional risk (not just a cosmetic type annotation issue) — explain what could have broken and for whom (seller dashboard vs customer storefront).

## What NOT to do
- Don't refactor unrelated code while doing this — keep the change scoped to fixing the actual type errors.
- Don't disable strict mode or add broad `// @ts-nocheck` comments to make errors disappear without fixing them.
