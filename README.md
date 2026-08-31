# CarLog

CarLog is a mobile-first maintenance log for iOS and Android. It stores vehicle and service data locally so the app remains usable without an account or network connection. Browser support exists for development and automated testing.

## Project status

Phase 1, development and persistence stabilization, is complete. Phase 2 will add the service record and history flows described in the [implementation plan](docs/implementation-plan.md).

Current functionality includes vehicle management, a versioned SQLite schema, browser and native persistence, visible startup errors, and automated schema coverage.

## Architecture

- Vue 3 and TypeScript for application code.
- Ionic Vue for the UI.
- Capacitor for iOS and Android packaging.
- Pinia for state management.
- Capacitor Community SQLite for local persistence.
- `jeep-sqlite` and SQL.js for browser-only SQLite development.

Completed service records and future maintenance schedules are separate concepts. A service record may contain several service items. See the [implementation plan](docs/implementation-plan.md) for the target data model and phase boundaries.

## Requirements

- Node 24, selected through `.nvmrc`.
- npm 11 or later.
- Xcode on macOS for iOS development.
- Android Studio and the Android SDK on Windows or macOS for Android development.

## Setup

Select the repository's Node version with either version manager:

```sh
fnm use
```

```sh
nvm use
```

Install the locked dependencies and start the browser development server:

```sh
npm ci
npm run dev
```

The development site runs at `http://localhost:5173` by default.

## Browser SQLite

Browser development uses the `jeep-sqlite` custom element. It stores the `car_log_db` SQLite database in the `jeepSqliteStore` IndexedDB database.

`sql.js` is pinned to version 1.11.0 because its WebAssembly module must match the JavaScript bundled by `jeep-sqlite` 2.8. Vite serves the installed module at `/assets/sql-wasm.wasm` during development and copies it into production builds. Do not add a manually copied WASM file under `public/` or update SQL.js independently from `jeep-sqlite`.

If dependency changes leave Vite's cache stale, restart it with:

```sh
npm run dev -- --force
```

Then hard-refresh the browser.

## Development database resets

Only reset disposable development data. The application never resets a database during startup.

- Browser: stop the development server, open browser developer tools, go to Application or Storage, delete the `jeepSqliteStore` IndexedDB database for `http://localhost:5173`, then restart the app.
- iOS simulator: delete CarLog from the simulator, then build and install it again. This removes the simulator's local SQLite database.
- Android emulator or development device: uninstall CarLog from the emulator or device, then build and install it again. This removes the app's local SQLite database.

The version 1 migration is now the development baseline. Future schema changes must append a new migration instead of editing version 1.

## Checks

Run the full local application check before committing:

```sh
npm run check
```

This command runs ESLint, Prettier verification, unit tests, SQLite integration tests, type checking, and the production web build.

Run the browser database startup test while `npm run dev` is running:

```sh
npm run test:e2e -- --spec tests/e2e/specs/databaseStartup.cy.ts
```

When dependencies, Capacitor configuration, or native integration changes, build the web application and sync both native projects:

```sh
npm run build:mobile
```

Useful focused commands include:

```sh
npm run lint
npm run format:check
npm run test:unit -- --run
npm run test:integration -- --run
npm run typecheck
npm run build
```

Use `npm run fix` to apply ESLint fixes followed by Prettier formatting.

## Planned features

- Multi-item DIY and shop service records.
- Service history editing and deletion.
- Mileage-based and date-based maintenance schedules.
- Local notifications and mileage update reminders.
- PDF history export, receipt attachments, and cloud backup after the first usable release.
