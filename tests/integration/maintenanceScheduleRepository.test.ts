import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { DATABASE_MIGRATIONS } from "@/services/databaseMigrations";
import {
    createMaintenanceSchedule,
    deleteMaintenanceSchedule,
    loadMaintenanceSchedules,
    updateMaintenanceSchedule,
    type MaintenanceScheduleDatabase,
} from "@/services/maintenanceScheduleRepository";
import type { MaintenanceSchedule } from "@/types";

class NodeDatabaseAdapter {
    constructor(private readonly database: DatabaseSync) {}

    async query(statement: string, values: unknown[] = []) {
        return { values: this.database.prepare(statement).all(...values) };
    }

    async run(statement: string, values: unknown[] = []) {
        const result = this.database.prepare(statement).run(...values);
        return { changes: { changes: Number(result.changes) } };
    }
}

let database: DatabaseSync | undefined;

afterEach(() => {
    database?.close();
    database = undefined;
});

function openDatabase(): DatabaseSync {
    const opened = new DatabaseSync(":memory:");
    opened.exec("PRAGMA foreign_keys = ON;");
    for (const migration of DATABASE_MIGRATIONS) {
        migration.statements.forEach((statement) => opened.exec(statement));
    }
    opened
        .prepare(
            `INSERT INTO vehicles (id, make, model, year, currentMileage)
             VALUES (?, ?, ?, ?, ?);`,
        )
        .run("vehicle-1", "Honda", "Civic", 2020, 45_000);
    database = opened;
    return opened;
}

function adapter(opened: DatabaseSync): MaintenanceScheduleDatabase {
    return new NodeDatabaseAdapter(
        opened,
    ) as unknown as MaintenanceScheduleDatabase;
}

function schedule(
    overrides: Partial<MaintenanceSchedule> = {},
): MaintenanceSchedule {
    return {
        id: "schedule-1",
        vehicleId: "vehicle-1",
        serviceType: "OIL_CHANGE",
        intervalMileage: 5_000,
        nextDueMileage: 50_000,
        reminderLeadMileage: 1_000,
        enabled: true,
        ...overrides,
    };
}

describe("maintenance schedule repository", () => {
    it("creates, loads, updates, disables, and deletes a schedule", async () => {
        const opened = openDatabase();
        const db = adapter(opened);

        await createMaintenanceSchedule(schedule(), db);
        await expect(
            loadMaintenanceSchedules("vehicle-1", db),
        ).resolves.toEqual([schedule()]);

        await updateMaintenanceSchedule(
            schedule({ intervalMileage: 7_500, nextDueMileage: 52_500 }),
            db,
        );
        await updateMaintenanceSchedule(
            schedule({
                intervalMileage: 7_500,
                nextDueMileage: 52_500,
                enabled: false,
            }),
            db,
        );
        const [disabled] = await loadMaintenanceSchedules("vehicle-1", db);
        expect(disabled).toEqual(
            expect.objectContaining({
                intervalMileage: 7_500,
                nextDueMileage: 52_500,
                enabled: false,
            }),
        );

        await deleteMaintenanceSchedule("schedule-1", db);
        await expect(
            loadMaintenanceSchedules("vehicle-1", db),
        ).resolves.toEqual([]);
    });

    it("prevents duplicate active standard schedules", async () => {
        const db = adapter(openDatabase());
        await createMaintenanceSchedule(schedule(), db);

        await expect(
            createMaintenanceSchedule(schedule({ id: "schedule-2" }), db),
        ).rejects.toThrow(
            "An active schedule for this service already exists for the vehicle.",
        );

        await expect(
            createMaintenanceSchedule(
                schedule({ id: "schedule-disabled", enabled: false }),
                db,
            ),
        ).resolves.toEqual(
            expect.objectContaining({
                id: "schedule-disabled",
                enabled: false,
            }),
        );
    });

    it("allows distinct Other schedules and rejects a repeated active label", async () => {
        const db = adapter(openDatabase());
        await createMaintenanceSchedule(
            schedule({
                id: "other-1",
                serviceType: "OTHER",
                label: "Differential fluid",
            }),
            db,
        );
        await expect(
            createMaintenanceSchedule(
                schedule({
                    id: "other-2",
                    serviceType: "OTHER",
                    label: "Cabin air filter",
                }),
                db,
            ),
        ).resolves.toEqual(
            expect.objectContaining({
                id: "other-2",
                label: "Cabin air filter",
            }),
        );
        await expect(
            createMaintenanceSchedule(
                schedule({
                    id: "other-3",
                    serviceType: "OTHER",
                    label: " differential fluid ",
                }),
                db,
            ),
        ).rejects.toThrow(
            "An active Other schedule with this label already exists",
        );
    });
});
