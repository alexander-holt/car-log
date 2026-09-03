import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { DATABASE_MIGRATIONS } from "@/services/databaseMigrations";
import {
    createServiceRecord,
    deleteServiceRecord,
    loadServiceRecord,
    loadServiceRecords,
    updateServiceRecord,
    type ServiceRecordDatabase,
} from "@/services/serviceRecordRepository";
import type { ServiceRecord } from "@/types";

class NodeDatabaseAdapter {
    constructor(private readonly database: DatabaseSync) {}

    async query(statement: string, values: unknown[] = []) {
        return { values: this.database.prepare(statement).all(...values) };
    }

    async run(statement: string, values: unknown[] = []) {
        const result = this.database.prepare(statement).run(...values);
        return { changes: { changes: Number(result.changes) } };
    }

    async beginTransaction() {
        this.database.exec("BEGIN TRANSACTION;");
        return { changes: { changes: 0 } };
    }

    async commitTransaction() {
        this.database.exec("COMMIT;");
        return { changes: { changes: 0 } };
    }

    async rollbackTransaction() {
        this.database.exec("ROLLBACK;");
        return { changes: { changes: 0 } };
    }
}

const temporaryDirectories: string[] = [];

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

function openDatabase(filename = ":memory:"): DatabaseSync {
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

function adapter(database: DatabaseSync): ServiceRecordDatabase {
    return new NodeDatabaseAdapter(
        database,
    ) as unknown as ServiceRecordDatabase;
}

function insertVehicle(
    database: DatabaseSync,
    currentMileage: number | null = 40_000,
): void {
    database
        .prepare(
            `INSERT INTO vehicles (id, make, model, year, currentMileage)
             VALUES (?, ?, ?, ?, ?);`,
        )
        .run("vehicle-1", "Honda", "Civic", 2020, currentMileage);
}

function mixedRecord(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
    const id = overrides.id ?? "record-1";
    return {
        id,
        vehicleId: "vehicle-1",
        date: "2026-08-31",
        mileage: 50_000,
        providerType: "DIY",
        totalCostCents: 20_000,
        items: [
            {
                id: `${id}-oil`,
                serviceRecordId: id,
                serviceType: "OIL_CHANGE",
                oilType: "0W-20 synthetic",
                filterReplaced: true,
            },
            {
                id: `${id}-tire`,
                serviceRecordId: id,
                serviceType: "TIRE_REPLACEMENT",
                treadDepthRemaining: 10,
            },
            {
                id: `${id}-inspection`,
                serviceRecordId: id,
                serviceType: "INSPECTION",
                notes: "Passed",
            },
            {
                id: `${id}-repair`,
                serviceRecordId: id,
                serviceType: "REPAIR",
                title: "Serpentine belt",
            },
            {
                id: `${id}-other`,
                serviceRecordId: id,
                serviceType: "OTHER",
                title: "Differential fluid",
            },
        ],
        ...overrides,
    };
}

function countRows(database: DatabaseSync, table: string): number {
    return (
        database.prepare(`SELECT COUNT(*) AS count FROM ${table};`).get() as {
            count: number;
        }
    ).count;
}

describe("service record repository with the version 1 schema", () => {
    it("persists and reloads one mixed record with all required item variants", async () => {
        const directory = mkdtempSync(
            join(tmpdir(), "car-log-service-records-"),
        );
        temporaryDirectories.push(directory);
        const filename = join(directory, "car-log.sqlite");
        const firstDatabase = openDatabase(filename);
        insertVehicle(firstDatabase);

        await createServiceRecord(mixedRecord(), adapter(firstDatabase));
        const firstLoad = await loadServiceRecords(
            "vehicle-1",
            adapter(firstDatabase),
        );
        expect(firstLoad).toHaveLength(1);
        expect(firstLoad[0].providerName).toBeUndefined();
        expect(firstLoad[0].items.map((item) => item.serviceType)).toEqual([
            "INSPECTION",
            "OIL_CHANGE",
            "OTHER",
            "REPAIR",
            "TIRE_REPLACEMENT",
        ]);
        await expect(
            loadServiceRecord("record-1", adapter(firstDatabase)),
        ).resolves.toEqual(firstLoad[0]);
        const vehicle = firstDatabase
            .prepare(
                "SELECT currentMileage, mileageUpdatedAt FROM vehicles WHERE id = ?;",
            )
            .get("vehicle-1") as {
            currentMileage: number;
            mileageUpdatedAt: string | null;
        };
        expect(vehicle.currentMileage).toBe(50_000);
        expect(vehicle.mileageUpdatedAt).toEqual(expect.any(String));
        firstDatabase.close();

        const secondDatabase = new DatabaseSync(filename);
        secondDatabase.exec("PRAGMA foreign_keys = ON;");
        const secondLoad = await loadServiceRecords(
            "vehicle-1",
            adapter(secondDatabase),
        );
        expect(secondLoad).toEqual(firstLoad);
        await expect(
            loadServiceRecord("record-1", adapter(secondDatabase)),
        ).resolves.toEqual(firstLoad[0]);
        secondDatabase.close();
    });

    it("edits one item without changing its siblings", async () => {
        const database = openDatabase();
        insertVehicle(database);
        const original = mixedRecord();
        await createServiceRecord(original, adapter(database));

        const updated: ServiceRecord = {
            ...original,
            items: original.items.map((item) =>
                item.serviceType === "OIL_CHANGE"
                    ? { ...item, oilType: "5W-30", filterReplaced: false }
                    : item,
            ),
        };
        await updateServiceRecord(updated, adapter(database));
        const saved = (
            await loadServiceRecords("vehicle-1", adapter(database))
        )[0];

        expect(
            saved.items.find((item) => item.serviceType === "OIL_CHANGE"),
        ).toEqual(
            expect.objectContaining({
                oilType: "5W-30",
                filterReplaced: false,
            }),
        );
        for (const siblingType of [
            "TIRE_REPLACEMENT",
            "INSPECTION",
            "REPAIR",
            "OTHER",
        ]) {
            expect(
                saved.items.find((item) => item.serviceType === siblingType),
            ).toEqual(
                original.items.find((item) => item.serviceType === siblingType),
            );
        }
        database.close();
    });

    it("replaces structured details when item categories change", async () => {
        const database = openDatabase();
        insertVehicle(database);
        const original = mixedRecord();
        await createServiceRecord(original, adapter(database));

        const updated: ServiceRecord = {
            ...original,
            items: original.items.map((item) => {
                if (item.serviceType === "OIL_CHANGE") {
                    return {
                        id: item.id,
                        serviceRecordId: item.serviceRecordId,
                        serviceType: "TIRE_ROTATION" as const,
                        treadDepthRemaining: 8,
                    };
                }
                if (item.serviceType === "TIRE_REPLACEMENT") {
                    return {
                        id: item.id,
                        serviceRecordId: item.serviceRecordId,
                        serviceType: "BRAKE_SERVICE" as const,
                    };
                }
                return item;
            }),
        };

        await updateServiceRecord(updated, adapter(database));

        expect(countRows(database, "oil_change_details")).toBe(0);
        const tireDetails = database
            .prepare(
                `SELECT serviceItemId, treadDepthRemaining
                 FROM tire_service_details;`,
            )
            .all();
        expect(tireDetails).toEqual([
            {
                serviceItemId: "record-1-oil",
                treadDepthRemaining: 8,
            },
        ]);
        const saved = await loadServiceRecord("record-1", adapter(database));
        expect(saved?.items.find((item) => item.id === "record-1-oil")).toEqual(
            expect.objectContaining({
                serviceType: "TIRE_ROTATION",
                treadDepthRemaining: 8,
            }),
        );
        expect(
            saved?.items.find((item) => item.id === "record-1-tire"),
        ).toEqual(expect.objectContaining({ serviceType: "BRAKE_SERVICE" }));
        database.close();
    });

    it("deletes the parent, items, and structured details", async () => {
        const database = openDatabase();
        insertVehicle(database);
        await createServiceRecord(mixedRecord(), adapter(database));

        await deleteServiceRecord("record-1", adapter(database));

        expect(countRows(database, "service_records")).toBe(0);
        expect(countRows(database, "service_items")).toBe(0);
        expect(countRows(database, "oil_change_details")).toBe(0);
        expect(countRows(database, "tire_service_details")).toBe(0);
        database.close();
    });

    it("rolls back the whole record when a structured detail write fails", async () => {
        const database = openDatabase();
        insertVehicle(database);
        database.exec(`
            CREATE TRIGGER reject_oil_details
            BEFORE INSERT ON oil_change_details
            BEGIN
                SELECT RAISE(ABORT, 'forced oil detail failure');
            END;
        `);

        await expect(
            createServiceRecord(mixedRecord(), adapter(database)),
        ).rejects.toThrow("forced oil detail failure");

        expect(countRows(database, "service_records")).toBe(0);
        expect(countRows(database, "service_items")).toBe(0);
        const vehicle = database
            .prepare("SELECT currentMileage FROM vehicles WHERE id = ?;")
            .get("vehicle-1") as { currentMileage: number };
        expect(vehicle.currentMileage).toBe(40_000);
        database.close();
    });

    it("never lowers vehicle mileage when older history is saved", async () => {
        const database = openDatabase();
        insertVehicle(database, 50_000);
        const older = mixedRecord({
            id: "older-record",
            date: "2025-01-01",
            mileage: 45_000,
        });

        const result = await createServiceRecord(older, adapter(database));

        expect(result.mileageUpdatedAt).toBeUndefined();
        const vehicle = database
            .prepare(
                "SELECT currentMileage, mileageUpdatedAt FROM vehicles WHERE id = ?;",
            )
            .get("vehicle-1") as {
            currentMileage: number;
            mileageUpdatedAt: string | null;
        };
        expect(vehicle).toEqual({
            currentMileage: 50_000,
            mileageUpdatedAt: null,
        });
        database.close();
    });
});
