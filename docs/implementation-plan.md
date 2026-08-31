# CarLog implementation plan

Status: Phase 1 completed and verified on August 31, 2026. Phase 2 has not started.

## Objective

Build a mobile-first maintenance log for vehicle owners who perform their own work, use repair shops, or do both. The first usable release must let a person:

- Manage one or more vehicles.
- Record complete service history.
- Group several services performed at the same time into one service record.
- Create manual mileage-based and date-based maintenance schedules.
- See upcoming and overdue maintenance.
- Receive date-based device notifications.
- Receive periodic prompts to update vehicle mileage.

The app targets iOS and Android. Browser support is for development until cloud storage makes a browser product worthwhile.

## Product principles

- Local data must remain usable without an account or network connection.
- A completed service record is historical data. A maintenance schedule is future work. Store and manage them separately.
- DIY work and shop work use the same record model.
- Users control maintenance intervals. Manufacturer recommendations from service visits must not silently create or change shedules without user approval.
- The app must not require location access for its core reminder flow. If needed, will consider drive detection for more timely mileage update reminders while users are still in sight of their odometer.
- Prefer explicit migrations and tested SQL over schema creation during every startup.

## Scope of the first usable release

### Included

- Vehicle create, read, update, and delete flows.
- Service record create, read, update, and delete flows.
- Multiple service items in one service record.
- Predefined service categories plus Other.
- Optional structured details for oil and tire services.
- Manual maintenance schedules based on mileage, date, or both.
- Upcoming, due-soon, and overdue status.
- Date-based local notifications.
- Configurable mileage-update reminders.
- Automatic vehicle mileage updates from newer service records.
- Local SQLite storage with versioned migrations.
- Loading, empty, and error states.

### Deferred

- Manufacturer schedule lookup and automatic recommendations.
- Receipt photo attachments.
- PDF history export.
- Cloud backup, sync, accounts, and browser production support.
- Reusable user-defined service categories.
- Automatic mileage detection through location, motion, Bluetooth, an OBD adapter, or a vehicle platform.

## Architecture decisions

### Platform

- Vue and TypeScript for application code.
- Ionic for mobile UI components.
- Capacitor for iOS and Android packaging and native APIs.
- Pinia for application state.
- Capacitor Community SQLite for local persistence.
- Capacitor Local Notifications for device reminders.

### Service record model

A service record represents work performed at one time and mileage. It may contain one service item or several. The shared record can represent work done at home or by a shop.

```text
Vehicle
└── Service record
    ├── Oil change item
    │   └── Oil change details
    ├── Tire replacement item
    │   └── Tire service details
    └── Inspection item
```

This avoids duplicating the date, mileage, provider, invoice total, notes, and future receipt attachment when several services happen together.

Each service item keeps its own category and optional details. This allows the UI to show category chips on one record card while schedules and queries still operate on individual services.

### Service categories

The initial predefined categories are:

- Oil change
- Tire rotation
- Tire replacement
- Brake service
- Battery service
- Inspection
- Repair
- Other

Other requires a user-entered title. The first release will not let users create reusable custom categories.

A category does not require a detail table. Add a detail table only when the app needs structured fields that are useful for display, validation, filtering, or export.

### Cost handling

- Store the authoritative total on the service record as integer cents.
- Do not require the user to split an invoice across service items.
- Leave room for optional item costs later.

The invoice total may include labor, tax, fees, and discounts that do not divide cleanly between individual services.

### Schedule model

Maintenance schedules are independent from completed service records. A schedule may exist before any matching service has been recorded.

Allow one active schedule for each standard service key on a vehicle. Allow multiple Other schedules because their labels describe different work.

Examples:

```text
Vehicle A + OIL_CHANGE       one active schedule
Vehicle A + TIRE_ROTATION    one active schedule
Vehicle A + OTHER            multiple active schedules with distinct labels
```

A service item may complete one schedule. Saving a record with several items can complete and advance several schedules in one transaction.

### Due-state rules

A schedule may contain a mileage interval, a time interval, or both.

- Overdue when the current date has reached the due date or current mileage has reached the due mileage.
- Due soon when either value falls within its configured lead threshold.
- Upcoming otherwise.
- If both date and mileage are present, whichever threshold arrives first controls the status.
- If current mileage is unknown, show only the date status and prompt for mileage.

Do not store derived status in SQLite. Calculate it from the schedule, current vehicle mileage, and current local date.

### Notification rules

- Date-based schedules may create a device notification.
- Ask for permission when the user enables their first notification, not during application startup.
- Schedule reminders at a predictable local time such as 9:00 AM.
- Maintenance reminders do not need exact-alarm permission.
- Update or cancel a pending notification whenever its schedule changes, completes, is disabled, or is deleted.
- Reconcile database schedules with pending notifications on startup and application resume.
- Tapping a notification opens the relevant vehicle and schedule.
- Permission denial must not disable in-app due states.

Mileage-only schedules cannot trigger from an odometer value the phone does not know. They update after the user enters mileage.

### Mileage-update reminders

Add a last-updated timestamp and reminder preferences to each vehicle.

- Default to an in-app mileage prompt after 30 days without an update.
- Let the user change the interval or disable the reminder.
- Offer an optional repeating local notification.
- Open a fast mileage-entry flow when the notification is tapped.
- Use safety-conscious wording such as "When parked, update your mileage."
- When a newer service record is saved, update the vehicle mileage and mileage timestamp in the same transaction.

Do not request background location for the first release. Location-triggered trip detection adds sensitive permissions, battery use, native-platform differences, store disclosures, and driver-distraction concerns. Reconsider it only as a separate opt-in feature with on-device processing and no stored coordinates.

### Manufacturer recommendations

Manufacturer recommendations are deferred. When implemented, a recommendation should open the normal schedule form with suggested values filled in.

- The user reviews and confirms the schedule.
- If an active schedule has the same standard service key, offer an update comparison instead of creating a duplicate.
- Do not silently create or overwrite schedules.
- Account for differences in engine, trim, climate, oil type, and driving conditions before presenting a recommendation as applicable.

## Target data model

Names below describe the intended logical schema. Exact SQLite constraints belong in the migration implementation.

### `vehicles`

```text
id
make
model
year
vin
licensePlate
engineType
currentMileage
mileageUpdatedAt
mileageReminderIntervalDays
mileageRemindersEnabled
createdAt
updatedAt
```

### `service_records`

```text
id
vehicleId
date
mileage
providerType       DIY or SHOP
providerName       optional shop or person name
totalCostCents
notes
createdAt
updatedAt
```

`vehicleId` references `vehicles` with `ON DELETE CASCADE`.

### `service_items`

```text
id
serviceRecordId
serviceType
title              required for OTHER, optional otherwise
notes
scheduleId
createdAt
updatedAt
```

`serviceRecordId` references `service_records` with `ON DELETE CASCADE`.

`scheduleId` references `maintenance_schedules` with `ON DELETE SET NULL`. Deleting a schedule must not remove service history.

### `oil_change_details`

```text
serviceItemId
oilType
filterReplaced
```

`serviceItemId` is the primary key and references `service_items` with `ON DELETE CASCADE`.

### `tire_service_details`

```text
serviceItemId
treadDepthRemaining
```

`serviceItemId` is the primary key and references `service_items` with `ON DELETE CASCADE`.

### `maintenance_schedules`

```text
id
vehicleId
serviceType
label
intervalMileage
intervalMonths
nextDueMileage
nextDueDate
reminderLeadMileage
reminderLeadDays
notificationId
enabled
lastCompletedServiceItemId
createdAt
updatedAt
```

Create indexes for vehicle history ordered by date, service items by record, and active schedules by vehicle. Enforce one active schedule per standard service key through a constraint where practical and through application validation.

## TypeScript model direction

Replace the current single-record discriminated union with a parent record and nested item union.

```ts
interface ServiceRecord {
    id: string;
    vehicleId: string;
    date: string;
    mileage: number;
    providerType: "DIY" | "SHOP";
    providerName?: string;
    totalCostCents?: number;
    notes?: string;
    items: ServiceItem[];
}
```

`ServiceItem` remains a discriminated union. Oil and tire variants contain their structured fields. Categories without structured fields use the shared item fields.

Store date-only values as `YYYY-MM-DD`. Parse and format them as local calendar dates rather than UTC timestamps.

## Database migrations

The development database contains disposable test data, so establish a clean version 1 baseline and reset existing development databases once.

Create `src/services/databaseMigrations.ts` containing:

- `DATABASE_VERSION`.
- An ordered list of `capSQLiteVersionUpgrade` objects.
- The complete version 1 schema, indexes, and constraints.

Initialization order:

1. Create the SQLite connection wrapper.
2. Initialize the web store when running in a browser.
3. Register every upgrade with `addUpgradeStatement`.
4. Create or retrieve a connection using `DATABASE_VERSION`.
5. Open the connection.
6. Execute `PRAGMA foreign_keys = ON` for the opened connection.
7. Load application state.

Remove `initializeTables` after versioned migrations own schema creation.

Migration rules:

- Version 1 is the complete clean baseline before the first public release.
- Reset Android, iOS simulator, and browser development data when adopting it.
- Never ship code that automatically destroys a user's database.
- After release, never edit an existing migration. Append version 2, version 3, and later upgrades.
- Keep the connection target version equal to the latest registered upgrade.
- Test a new empty database and an upgrade from the previous version.

Reference: [Capacitor Community SQLite upgrade documentation](https://github.com/capacitor-community/sqlite/blob/master/docs/UpgradeDatabaseVersion.md).

## Core user flows

### Add a vehicle

1. Open My Garage.
2. Add make, model, year, and optional vehicle details.
3. Enter current mileage or leave it unknown.
4. Save and open the vehicle summary.

### Add a service record

1. Start a new service record from the vehicle summary.
2. Enter date, mileage, and who performed the work.
3. Add one or more service items.
4. Enter category-specific details for each item.
5. Enter the invoice or project total and shared notes.
6. Review schedules that the items will complete.
7. Save the record, items, details, vehicle mileage, and schedule updates in one transaction.

### View history

- Show one card per service record.
- Display date, mileage, provider, total cost, and one chip for each service item category.
- Expand or open the card to show item-level details and notes.
- Provide edit and delete actions.
- Confirm destructive actions and show failures to the user.

### Create a maintenance schedule

1. Choose a standard service type or Other.
2. Enter a mileage interval, time interval, or both.
3. Enter the next due mileage and date where applicable.
4. Choose lead thresholds and notification preference.
5. Save and show the derived status.

### Complete scheduled maintenance

1. Open a due schedule and choose Log service.
2. Prefill a service item matching the schedule.
3. Add other work completed at the same time if needed.
4. Save the service record.
5. Advance each completed schedule from the service date and mileage.

### Update mileage

1. Open the vehicle summary, stale-mileage prompt, or mileage notification.
2. Enter the current odometer value.
3. Reject a value lower than the saved mileage unless the user explicitly confirms an odometer correction.
4. Save mileage and update every derived due state.

## Implementation phases

### Phase 1: stabilize development and persistence

- [x] Use Node 24 through `.nvmrc` on Windows and macOS.
- [x] Reinstall dependencies from `package-lock.json` with the declared Node and npm versions.
- [x] Confirm linting, type checking, unit tests, integration tests, and build commands.
- [x] Replace startup table creation with versioned migrations and the complete version 1 schema.
- [x] Enable foreign keys explicitly.
- [x] Add database indexes.
- [x] Replace hidden startup failures with a visible error state.
- [x] Add a real-schema integration test that creates the database and exercises every supported service item type.

Exit criteria:

- [x] Repeated application restarts open the same data.
- [x] A clean install creates the complete schema.
- [x] Invalid schema or insert SQL fails an automated test.
- [x] Lint, formatting, type checking, unit tests, integration tests, and build pass.

Completion record:

- `src/services/databaseMigrations.ts` owns schema version 1, its constraints, and its indexes.
- `src/services/databaseService.ts` registers migrations before opening `car_log_db` and enables foreign keys for each opened connection.
- `tests/integration/databaseMigrations.test.ts` covers clean schema creation, every service item type, invalid inserts, foreign-key behavior, schedule uniqueness, and persistence across database restarts.
- Startup failures render in the application instead of leaving a blank screen.
- Browser persistence uses `jeep-sqlite`. SQL.js stays pinned to 1.11.0, and Vite copies the matching WASM module from the installed package instead of relying on a checked-in binary.
- `tests/e2e/specs/databaseStartup.cy.ts` verifies that the browser SQLite store initializes and the application mounts without a startup error.
- `npm run check`, the browser database startup test, and `npm run build:mobile` passed. An iOS smoke test also confirmed startup and persistence.
- Development database reset instructions now live in `README.md`. The application does not perform destructive resets.

### Phase 2: implement service records and history

- Replace the current maintenance record types with `ServiceRecord` and `ServiceItem` models.
- Implement service record, item, and detail-table queries.
- Use database transaction methods for multi-table writes.
- Build the multi-item service record form.
- Support DIY and shop provider choices without requiring a shop name.
- Update record cards to show category chips.
- Add record detail, edit, and delete flows.
- Update vehicle mileage after saving a newer record.
- Add validation for mileage, dates, costs, VIN, and structured detail fields.
- Add loading indicators, empty states, error messages, and Ionic toasts.
- Remove debug logs and commented duplicate implementations.

Exit criteria:

- One service record can contain oil, tire, inspection, repair, or Other items.
- A mixed service record displays as one history card with several chips.
- Editing one item does not corrupt its siblings.
- Deleting a record removes its items and details.
- DIY work never requires a shop name.
- Data survives native application restarts.

### Phase 3: implement schedules and in-app reminders

- Add schedule types, persistence, store, and forms.
- Add Upcoming Maintenance above service history.
- Calculate upcoming, due-soon, and overdue states.
- Show the nearest maintenance item on each vehicle in My Garage.
- Add manual odometer updates and stale-mileage prompts.
- Connect service items to schedules.
- Advance all completed schedules in the service-record transaction.
- Prevent duplicate active schedules for standard service keys.

Exit criteria:

- Users can create, edit, disable, and delete schedules.
- Date and mileage boundaries produce the expected state.
- One mixed service record can complete several schedules.
- The vehicle summary updates immediately after mileage changes.

### Phase 4: add local notifications

- Add and configure `@capacitor/local-notifications`.
- Request permission only after user intent.
- Schedule, update, cancel, and reconcile date reminders.
- Add notification tap routing.
- Add configurable mileage-update notifications.
- Handle denied permission without breaking in-app reminders.
- Verify behavior on supported iOS and Android versions.

Exit criteria:

- Enabled date reminders appear on a physical or simulated device.
- Editing or completing a schedule replaces or cancels its old notification.
- Notification taps open the correct vehicle.
- Denied permission produces a clear, recoverable UI state.

### Phase 5: harden the mobile release

- Replace the placeholder Cypress test with the main user journey.
- Add fixed-date tests for timezone and due-state boundaries.
- Test fresh install and migration behavior.
- Test database rollback for partial service-record failures.
- Test iOS and Android persistence across app restarts.
- Change the starter Capacitor application ID before distribution.
- Add production application icons and launch assets.
- Update README setup, development, test, and mobile build instructions.
- Complete a manual accessibility pass for forms, chips, dialogs, and errors.

## Test strategy

### Unit tests

- Vehicle store operations and validation.
- Service record row-to-domain mapping.
- Multi-item transaction orchestration.
- Due-state calculations at exact date and mileage boundaries.
- Schedule advancement for mileage, time, and combined intervals.
- Local calendar date parsing and formatting.
- Notification ID generation and reconciliation decisions.

### SQLite integration tests

- Create the complete schema from an empty database.
- Insert, query, update, and delete every service item variant.
- Verify foreign-key cascades and `SET NULL` behavior.
- Roll back an entire mixed service record when one detail insert fails.
- Upgrade a previous-version fixture once migrations exist beyond version 1.

### Component and end-to-end tests

- Add and edit a vehicle.
- Add a DIY service record with one item.
- Add a shop service record with several items.
- Display the correct category chips.
- Complete several schedules with one record.
- Update mileage from a stale-mileage prompt.
- Show useful errors when persistence fails.

### Native smoke tests

- Install and restart on iOS and Android.
- Confirm SQLite persistence.
- Grant and deny notification permission.
- Deliver, update, cancel, and tap a notification.
- Confirm date display in the device timezone.

## First-release acceptance criteria

- A user can manage multiple vehicles without an account.
- A user can record DIY or shop work.
- One service record can contain several categorized service items.
- History remains after native application restarts.
- A user can create manual date and mileage schedules.
- The app identifies upcoming and overdue maintenance correctly.
- Date notifications work when permission is granted.
- Mileage reminders work without location access.
- Completing maintenance advances the matching schedules.
- Database, store, and primary UI flows have automated coverage.
- Type checking, linting, tests, and production build pass.

## Known current gaps

- The existing model supports only one maintenance type per record.
- Record edit and delete operations are not exposed by the current UI.
- The current next-service fields are stored on historical records and have no due-state behavior.
- Vehicle mileage is not updated from service history.
- End-to-end coverage checks browser database startup, but the main service-record user journey remains for a later phase.
- The native application ID still uses the Ionic starter value.

## Next implementation step

Review and merge the Phase 1 persistence branch without mixing in Phase 2 work. After Phase 1 reaches `main`, create `feat/phase-2-service-records` from the latest `main` and implement only the Phase 2 service record and history scope.
