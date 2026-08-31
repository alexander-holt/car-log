import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
    DATABASE_MIGRATIONS,
    DATABASE_VERSION,
} from "@/services/databaseMigrations";

const serviceTypes = [
    "OIL_CHANGE",
    "TIRE_ROTATION",
    "TIRE_REPLACEMENT",
    "BRAKE_SERVICE",
    "BATTERY_SERVICE",
    "INSPECTION",
    "REPAIR",
    "OTHER",
] as const;

function openMigratedDatabase(filename = ":memory:"): DatabaseSync {
    const database = new DatabaseSync(filename);
    database.exec("PRAGMA foreign_keys = ON;");

    for (const migration of DATABASE_MIGRATIONS) {
        for (const statement of migration.statements) {
            database.exec(statement);
        }
        database.exec(`PRAGMA user_version = ${migration.toVersion};`);
    }

    return database;
}

function insertVehicle(database: DatabaseSync, id = "vehicle-1"): void {
    database
        .prepare(
            `
                INSERT INTO vehicles (id, make, model, year, currentMileage)
                VALUES (?, ?, ?, ?, ?);
            `,
        )
        .run(id, "Honda", "Civic", 2020, 45_000);
}

function insertServiceRecord(
    database: DatabaseSync,
    id = "record-1",
    vehicleId = "vehicle-1",
): void {
    database
        .prepare(
            `
                INSERT INTO service_records (
                    id,
                    vehicleId,
                    date,
                    mileage,
                    providerType,
                    totalCostCents
                )
                VALUES (?, ?, ?, ?, ?, ?);
            `,
        )
        .run(id, vehicleId, "2026-08-31", 45_000, "DIY", 12_345);
}

function rowCount(database: DatabaseSync, table: string): number {
    const row = database
        .prepare(`SELECT COUNT(*) AS count FROM ${table};`)
        .get() as { count: number };

    return row.count;
}

describe("version 1 database migration", () => {
    it("creates the complete schema and indexes from an empty database", () => {
        const database = openMigratedDatabase();

        const tables = database
            .prepare(
                `
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                    ORDER BY name;
                `,
            )
            .all()
            .map((row) => row.name);
        const indexes = database
            .prepare(
                `
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'index' AND name LIKE 'idx_%'
                    ORDER BY name;
                `,
            )
            .all()
            .map((row) => row.name);
        const version = database.prepare("PRAGMA user_version;").get() as {
            user_version: number;
        };

        expect(tables).toEqual([
            "maintenance_schedules",
            "oil_change_details",
            "service_items",
            "service_records",
            "tire_service_details",
            "vehicles",
        ]);
        expect(indexes).toEqual([
            "idx_maintenance_schedules_active_standard",
            "idx_maintenance_schedules_vehicle_enabled",
            "idx_service_items_record",
            "idx_service_records_vehicle_date",
        ]);
        expect(version.user_version).toBe(DATABASE_VERSION);

        database.close();
    });

    it("inserts, queries, updates, and deletes every service item type", () => {
        const database = openMigratedDatabase();
        insertVehicle(database);
        insertServiceRecord(database);

        const insertItem = database.prepare(
            `
                INSERT INTO service_items (
                    id,
                    serviceRecordId,
                    serviceType,
                    title
                )
                VALUES (?, ?, ?, ?);
            `,
        );

        for (const serviceType of serviceTypes) {
            insertItem.run(
                `item-${serviceType}`,
                "record-1",
                serviceType,
                serviceType === "OTHER" ? "Differential fluid" : null,
            );
        }

        database
            .prepare(
                `
                    INSERT INTO oil_change_details (
                        serviceItemId,
                        oilType,
                        filterReplaced
                    )
                    VALUES (?, ?, ?);
                `,
            )
            .run("item-OIL_CHANGE", "0W-20 synthetic", 1);
        const insertTireDetails = database.prepare(
            `
                INSERT INTO tire_service_details (
                    serviceItemId,
                    treadDepthRemaining
                )
                VALUES (?, ?);
            `,
        );
        insertTireDetails.run("item-TIRE_ROTATION", 7.5);
        insertTireDetails.run("item-TIRE_REPLACEMENT", 10);

        expect(rowCount(database, "service_items")).toBe(serviceTypes.length);
        expect(rowCount(database, "oil_change_details")).toBe(1);
        expect(rowCount(database, "tire_service_details")).toBe(2);

        database
            .prepare(
                `
                    UPDATE service_items
                    SET notes = ?
                    WHERE serviceRecordId = ?;
                `,
            )
            .run("Verified", "record-1");

        const updatedItems = database
            .prepare(
                `
                    SELECT COUNT(*) AS count
                    FROM service_items
                    WHERE notes = ?;
                `,
            )
            .get("Verified") as { count: number };
        expect(updatedItems.count).toBe(serviceTypes.length);

        database
            .prepare("DELETE FROM service_records WHERE id = ?;")
            .run("record-1");

        expect(rowCount(database, "service_items")).toBe(0);
        expect(rowCount(database, "oil_change_details")).toBe(0);
        expect(rowCount(database, "tire_service_details")).toBe(0);

        database.close();
    });

    it("rejects invalid item types, untitled Other items, and orphan rows", () => {
        const database = openMigratedDatabase();
        insertVehicle(database);
        insertServiceRecord(database);
        const insertItem = database.prepare(
            `
                INSERT INTO service_items (
                    id,
                    serviceRecordId,
                    serviceType,
                    title
                )
                VALUES (?, ?, ?, ?);
            `,
        );

        expect(() =>
            insertItem.run("invalid-type", "record-1", "WASH", null),
        ).toThrow();
        expect(() =>
            insertItem.run("untitled-other", "record-1", "OTHER", null),
        ).toThrow();
        expect(() =>
            insertItem.run("orphan", "missing-record", "INSPECTION", null),
        ).toThrow();

        database.close();
    });

    it("enforces active schedule uniqueness and preserves linked history", () => {
        const database = openMigratedDatabase();
        insertVehicle(database);
        insertServiceRecord(database);
        const insertSchedule = database.prepare(
            `
                INSERT INTO maintenance_schedules (
                    id,
                    vehicleId,
                    serviceType,
                    label,
                    intervalMileage,
                    enabled
                )
                VALUES (?, ?, ?, ?, ?, ?);
            `,
        );

        insertSchedule.run(
            "schedule-oil",
            "vehicle-1",
            "OIL_CHANGE",
            null,
            5_000,
            1,
        );
        expect(() =>
            insertSchedule.run(
                "schedule-oil-duplicate",
                "vehicle-1",
                "OIL_CHANGE",
                null,
                7_500,
                1,
            ),
        ).toThrow();
        insertSchedule.run(
            "schedule-oil-disabled",
            "vehicle-1",
            "OIL_CHANGE",
            null,
            7_500,
            0,
        );

        database
            .prepare(
                `
                    INSERT INTO service_items (
                        id,
                        serviceRecordId,
                        serviceType,
                        scheduleId
                    )
                    VALUES (?, ?, ?, ?);
                `,
            )
            .run("item-OIL_CHANGE", "record-1", "OIL_CHANGE", "schedule-oil");
        database
            .prepare(
                `
                    UPDATE maintenance_schedules
                    SET lastCompletedServiceItemId = ?
                    WHERE id = ?;
                `,
            )
            .run("item-OIL_CHANGE", "schedule-oil");
        database
            .prepare("DELETE FROM maintenance_schedules WHERE id = ?;")
            .run("schedule-oil");

        const item = database
            .prepare("SELECT scheduleId FROM service_items WHERE id = ?;")
            .get("item-OIL_CHANGE") as { scheduleId: string | null };
        expect(item.scheduleId).toBeNull();
        expect(rowCount(database, "service_records")).toBe(1);

        database.close();
    });

    it("reopens the same persisted data across database restarts", () => {
        const directory = mkdtempSync(join(tmpdir(), "car-log-integration-"));
        const filename = join(directory, "car-log.sqlite");

        try {
            const firstConnection = openMigratedDatabase(filename);
            insertVehicle(firstConnection, "persistent-vehicle");
            firstConnection.close();

            const secondConnection = new DatabaseSync(filename);
            secondConnection.exec("PRAGMA foreign_keys = ON;");
            const vehicle = secondConnection
                .prepare("SELECT make, model FROM vehicles WHERE id = ?;")
                .get("persistent-vehicle") as {
                make: string;
                model: string;
            };

            expect(vehicle).toEqual({ make: "Honda", model: "Civic" });
            secondConnection.close();
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
