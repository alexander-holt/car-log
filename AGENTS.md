# CarLog repository guidance

## Project context

- Read `docs/implementation-plan.md` before changing architecture, persistence, product scope, or implementation sequencing.
- Treat the implementation plan's phases and exit criteria as the default development milestones.
- CarLog is mobile-first. Android development happens on Windows and iOS development happens on macOS. Browser support is for development unless the plan changes.
- Keep completed service records separate from maintenance schedules. A service record may contain multiple service items.

## Implementation workflow

- Work from `docs/implementation-plan.md` unless the current user request explicitly changes priorities.
- Implement only the currently requested phase or scoped task.
- Do not begin the next implementation phase automatically after completing the current one.
- If implementation reveals that the plan needs an architectural or product-scope change, stop and explain the conflict before making that change.

## Environment

- Use Node 24 from `.nvmrc` and npm 11 or later.
- Run `fnm use` with fnm or `nvm use` with nvm after entering the repository.
- Prefer npm scripts and cross-platform TypeScript or JavaScript.
- If a task needs a platform-specific command, identify whether it is for Windows, macOS, Android, or iOS.

## Git workflow

- Never make implementation changes directly on `main`.
- Keep `main` stable and reasonably buildable.
- The implementation plan's phases are the default branch boundaries.
- Use these phase branches when implementing the current plan:

    - `feat/phase-1-persistence`
    - `feat/phase-2-service-records`
    - `feat/phase-3-maintenance-schedules`
    - `feat/phase-4-local-notifications`
    - `chore/phase-5-release-hardening`

- Do not create a separate branch for every small task within a phase.
- If a phase becomes too large to review safely, split an independently reviewable unit into a descriptive `feat/...`, `fix/...`, `test/...`, `refactor/...`, or `chore/...` branch.
- Create new phase or feature branches from the latest `main` unless explicitly instructed otherwise.
- Do not create stacked branches from unfinished branches unless explicitly approved.
- Do not merge into `main`, force-push, rewrite history, or delete branches unless explicitly requested.

## Commits

- Make small, logical commits as work progresses rather than one large commit at the end of a phase.
- Keep each commit focused and leave the repository in a reasonable state when practical.
- Prefer Conventional Commit-style prefixes:

    - `feat:` new functionality
    - `fix:` bug fixes
    - `refactor:` internal restructuring
    - `test:` test changes
    - `chore:` tooling or configuration
    - `docs:` documentation

- Do not commit unrelated user changes.
- Before committing, review `git status` and stage only files related to the current task. Do not use `git add -A` or `git add .` when unrelated working-tree changes are present.

## Change rules

- Make the smallest change that solves the requested problem. Do not refactor unrelated code.
- Preserve existing user changes in the working tree.
- Make schema changes through versioned migrations.
- After the first release, append migrations instead of editing released migrations.
- Do not reset or destructively migrate a database without explicit approval.
- Do not edit files under `android/` or `ios/` unless the task requires native configuration or native code.

## Verification

For application code changes, run:

```text
npm run lint
npm run test:unit -- --run
npm run build
```

Run additional relevant checks from `docs/implementation-plan.md` when the affected phase requires them.

Run `npm run build:mobile` when dependencies, Capacitor configuration, or native integration changes.

Test native behavior on the affected platform when applicable and report any checks that could not be run.

Before declaring an implementation phase complete:

1. Review the phase's exit criteria in `docs/implementation-plan.md`.
2. Run the relevant lint, type-check, unit, integration, end-to-end, build, and native checks that currently exist.
3. Report any exit criteria that remain unsatisfied.
4. Summarize:

    - what changed,
    - commits created,
    - verification performed,
    - known issues or deviations,
    - whether the phase is ready to merge.

Do not merge the phase branch into `main` unless explicitly requested.
