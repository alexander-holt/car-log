# CarLog repository guidance

## Project context

- Read `docs/implementation-plan.md` before changing architecture, persistence, or product scope.
- CarLog is mobile-first. Android development happens on Windows and iOS development happens on macOS. Browser support is for development unless the plan changes.
- Keep completed service records separate from maintenance schedules. A service record may contain multiple service items.

## Environment

- Use Node 24 from `.nvmrc` and npm 11 or later.
- Run `fnm use` with fnm or `nvm use` with nvm after entering the repository.
- Prefer npm scripts and cross-platform TypeScript or JavaScript. If a task needs a platform-specific command, identify whether it is for Windows, macOS, Android, or iOS.

## Change rules

- Make the smallest change that solves the requested problem. Do not refactor unrelated code.
- Preserve existing user changes in the working tree.
- Make schema changes through versioned migrations. After the first release, append migrations instead of editing released ones.
- Do not reset or destructively migrate a database without explicit approval.
- Do not edit files under `android/` or `ios/` unless the task requires native configuration or native code.

## Verification

For application code changes, run:

```text
npm run lint
npm run test:unit -- --run
npm run build
```

Run `npm run build:mobile` when dependencies, Capacitor configuration, or native integration changes. Test native behavior on the affected platform and report any checks that could not be run.
