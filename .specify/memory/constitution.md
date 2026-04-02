<!--
  SYNC IMPACT REPORT
  ==================
  Version change: 0.0.0 (unratified template) → 1.0.0
  Bump rationale: MAJOR — initial ratification; all placeholder tokens replaced
    with concrete project-specific governance rules.

  Modified principles:
    - N/A (first ratification, no prior version)

  Added sections:
    - Core Principles (I–V)
    - Technology Stack
    - Development Workflow
    - Governance

  Removed sections:
    - N/A

  Templates reviewed:
    ✅ .specify/templates/plan-template.md        — compatible; no changes required
    ✅ .specify/templates/spec-template.md        — compatible; no changes required
    ✅ .specify/templates/tasks-template.md       — compatible; no changes required
    ✅ .specify/templates/agent-file-template.md  — compatible; no changes required

  Deferred TODOs:
    - None; all fields resolved from repo context.
-->

# speckit-demo-poc Constitution

## Core Principles

### I. Component-First Architecture (React 19)

All UI work MUST be expressed as React function components. Class components are
forbidden. Every component MUST have a single, well-defined responsibility.

- Use React 19 APIs correctly: `use()`, `useActionState`, `useOptimistic`, and
  `useFormStatus` are preferred over hand-rolled equivalents where applicable.
- Components MUST be designed to be React Compiler-compatible: no manual
  `useMemo`/`useCallback` unless profiling proves it necessary and a comment
  documents the evidence.
- State MUST be lifted only as far as required; co-locate state with the
  component that owns it.
- Side effects MUST be isolated in custom hooks; components remain pure renderers.
- Prop drilling beyond two levels MUST be replaced by context or a dedicated
  state-management primitive.

**Rationale**: React 19's compiler and concurrent-mode features provide
correctness and performance guarantees only when components are pure and
responsibility is clearly bounded. Violations make compiler optimisations unsafe
and debugging exponentially harder.

### II. TypeScript Strict Mode (NON-NEGOTIABLE)

All source files MUST be TypeScript (`.ts` / `.tsx`). The `strict` flag MUST be
`true` in `tsconfig.app.json` at all times.

- `any` is forbidden. Use `unknown` with explicit type-guard narrowing wherever
  the type is genuinely unresolvable at authorship time.
- Every exported function, hook, and component MUST have an explicit return-type
  annotation.
- `as` type assertions MUST be accompanied by an inline comment explaining why
  the cast is safe. More than two assertions per file is a code-smell that
  requires peer-review justification.
- Third-party packages that lack bundled types or a `@types/*` companion MUST be
  wrapped in a typed adapter module before use.
- `tseslint.configs.strictTypeChecked` MUST be active in `eslint.config.js`;
  `tseslint.configs.stylisticTypeChecked` is strongly recommended.
- `tsc --noEmit` MUST report zero errors before any commit is merged.

**Rationale**: Strict TypeScript eliminates an entire class of runtime errors,
makes large-scale refactoring safe, and is the primary correctness net for a
codebase without a compiled server layer.

### III. Test-First Development (NON-NEGOTIABLE)

Tests MUST be written and reviewed before implementation code is written.

- Red → Green → Refactor cycle is enforced for every non-trivial change.
- Unit tests target individual hooks, utilities, and pure functions (Vitest).
- Component tests use React Testing Library and assert on user-visible behaviour,
  not implementation details. Snapshot-only tests are forbidden.
- All tests MUST pass `tsc --noEmit` without errors before being committed.
- A feature is considered complete only when all acceptance scenarios from its
  `spec.md` have corresponding passing tests.
- Test coverage for new code MUST not fall below 80 % line coverage.

**Rationale**: Frontend logic is as business-critical as backend logic. Writing
tests first reveals design issues before they become load-bearing in production
and ensures the specification is unambiguous.

### IV. Performance & Bundle Discipline

Every route MUST be code-split via `React.lazy` + `Suspense`. No new synchronous
top-level dependency import exceeding 10 kB (minified + gzip) is permitted
without an explicit bundle-budget sign-off documented in the relevant `plan.md`.

- Core Web Vitals targets MUST be met for every production release:
  LCP < 2.5 s, CLS < 0.1, INP < 200 ms.
- Images and static assets MUST declare explicit `width` and `height` attributes
  to prevent layout shift.
- `vite build --mode production` MUST produce zero chunk-size warnings exceeding
  500 kB.
- Dynamic `import()` MUST be used for feature-flag-gated and non-critical paths.
- No polyfills for evergreen-browser features are to be added without a
  documented compatibility requirement.

**Rationale**: A fast, jank-free UI is a user-facing product requirement. Bundle
bloat compounds sprint over sprint; the only effective control is enforcing gates
at the point of each change.

### V. Accessibility & Semantic HTML

Every interactive element MUST be keyboard-operable and screen-reader-accessible
by default.

- HTML5 semantic elements (`<nav>`, `<main>`, `<article>`, `<section>`,
  `<button>`, etc.) MUST be used in preference to generic `<div>` or `<span>`.
- `aria-*` attributes are a last resort; native element semantics MUST be
  exhausted first.
- All non-decorative images MUST have descriptive `alt` text. Decorative images
  MUST use `alt=""` explicitly.
- Colour contrast MUST meet WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large
  text and UI components.
- `eslint-plugin-jsx-a11y` MUST be active in `eslint.config.js` and report zero
  errors in CI.

**Rationale**: Accessibility is a correctness property of the UI. Retrofitting
it after the fact is significantly more expensive than building it in from the
start, and exclusionary UIs are unacceptable product outcomes.

## Technology Stack

**Runtime**: React ^19.2.x, React DOM ^19.2.x
**Language**: TypeScript ~5.9.x — compiler flags: `strict: true`,
  `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
**Build tool**: Vite ^8.x with `@vitejs/plugin-react` (Oxc transformer)
**Linting**: ESLint ^9.x, `typescript-eslint` (strictTypeChecked + stylisticTypeChecked),
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`
**Testing**: Vitest + React Testing Library (to be added prior to first feature spec)
**Module system**: ESNext modules (`"type": "module"` in `package.json`)
**Package manager**: npm — lock file MUST be committed

Forbidden dependencies:
- jQuery, Lodash (use native ES2024+ or `es-toolkit`)
- CSS-in-JS runtime libraries (prefer CSS Modules or a zero-runtime solution)
- `react-scripts` / Create React App packages
- React class components or `createRef`

## Development Workflow

1. **Spec first** — Every feature MUST have an approved `spec.md` (produced by
   `/speckit.spec`) before a `plan.md` is created.
2. **Plan approval** — The Constitution Check in `plan.md` MUST pass for all five
   principles before implementation work begins.
3. **Branch discipline** — Feature branches MUST be named `###-short-description`.
   Direct pushes to `main` are forbidden.
4. **CI gate** — All of the following MUST pass with zero errors before a PR can
   be merged: `tsc --noEmit`, `eslint .`, `vitest run --coverage`.
   Lighthouse CI MUST report no Core Web Vitals regressions against `main`.
5. **Peer review** — A minimum of one peer review is required per PR. The
   reviewer MUST explicitly verify Constitution compliance, not only code
   correctness.
6. **Merge strategy** — Squash merge to `main`. Commit messages MUST follow
   [Conventional Commits](https://www.conventionalcommits.org/).

## Governance

This constitution supersedes all other practises, conventions, and style guides
in this repository. When a conflict exists between this document and any other
document, this document takes precedence.

**Amendment procedure**:

1. Open a PR that modifies `.specify/memory/constitution.md`.
2. Increment `CONSTITUTION_VERSION` per the versioning policy below.
3. Update the Sync Impact Report HTML comment at the top of this file.
4. Obtain approval from at least one other contributor.
5. After merge, run `/speckit.constitution` to propagate changes to dependent
   templates and agent guidance files.

**Versioning policy**:

- MAJOR — a principle is removed, redefined with incompatible meaning, or
  governance rules are materially restructured.
- MINOR — a new principle or section is added, or an existing principle receives
  materially expanded guidance.
- PATCH — wording clarifications, typo fixes, or non-semantic examples added;
  no change to enforceable rules.

**Compliance review**: The "Constitution Check" section in every `plan.md` serves
as the per-feature compliance gate. Any documented variance from this constitution
MUST include written justification under "Complexity Tracking" in that `plan.md`.

**Version**: 1.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-04-02
