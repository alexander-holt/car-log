import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRecordStore } from "@/store/recordStore";
import { databaseService } from "@/services/databaseService";

vi.mock("@/services/databaseService", () => ({
    databaseService: {
        getDb: vi.fn(),
    },
}));

describe("useRecordStore", () => {
    let mockDb: any;

    beforeEach(() => {
        // Create a fresh Pinia instance before every test
        setActivePinia(createPinia());

        // Create a fresh mock for the database methods
        mockDb = {
            query: vi.fn(),
            run: vi.fn(),
        };

        // Tell our mocked service to return our mockDb object
        (databaseService.getDb as any).mockReturnValue(mockDb);
    });

    it("loads records and maps camelCase columns to TypeScript types", async () => {
        const store = useRecordStore();

        // Simulate SQLite returning a REPAIR row with camelCase columns
        mockDb.query.mockResolvedValue({
            values: [
                {
                    id: "rec_1",
                    vehicleId: "veh_1",
                    type: "REPAIR",
                    date: "2026-08-01T12:00:00.000Z",
                    mileage: 45000,
                    cost: 150.5,
                    shopName: "Bob's Auto",
                    partReplaced: "Brake Pads", // camelCase from your updated schema
                },
            ],
        });

        await store.loadRecords("veh_1");

        // Verify the database was called correctly
        expect(mockDb.query).toHaveBeenCalledTimes(1);
        expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [
            "veh_1",
        ]);

        // Verify the Pinia state updated correctly
        expect(store.records.length).toBe(1);
        expect(store.records[0].type).toBe("REPAIR");

        // TypeScript knows it's a repair record, so this is type-safe
        if (store.records[0].type === "REPAIR") {
            expect(store.records[0].partReplaced).toBe("Brake Pads");
            expect(store.records[0].cost).toBe(150.5);
        }
    });

    it("deletes a record and updates local state", async () => {
        const store = useRecordStore();

        // Seed the store with some initial state
        store.records = [
            {
                id: "rec_1",
                vehicleId: "veh_1",
                type: "REPAIR",
                date: "2026-08-01",
                mileage: 10,
                partReplaced: "Filter",
            },
        ];

        // Simulate a successful database deletion
        mockDb.run.mockResolvedValue();

        await store.deleteRecord("rec_1");

        // Verify the database run method was called with the right ID
        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM maintenance_records"),
            ["rec_1"],
        );

        // Verify it was removed from the Vue/Pinia reactive array
        expect(store.records.length).toBe(0);
    });

    it("loads and maps OIL_CHANGE and TIRE_ROTATION records correctly", async () => {
        const store = useRecordStore();

        // Simulate the database returning one of each type
        mockDb.query.mockResolvedValue({
            values: [
                {
                    id: "rec_1",
                    vehicleId: "veh_1",
                    type: "OIL_CHANGE",
                    date: "2026-08-01",
                    mileage: 100,
                    filterReplaced: 1,
                    oilType: "Synthetic",
                    nextServiceMileage: 6000,
                },
                {
                    id: "rec_2",
                    vehicleId: "veh_1",
                    type: "TIRE_ROTATION",
                    date: "2026-08-02",
                    mileage: 150,
                    treadDepthRemaining: 5.5,
                },
            ],
        });

        await store.loadRecords("veh_1");

        expect(store.records.length).toBe(2);

        // Check Oil Change (verifying the 1 converts to true)
        const oilChange = store.records.find((r) => r.type === "OIL_CHANGE");
        expect(oilChange?.filterReplaced).toBe(true);
        expect(oilChange?.oilType).toBe("Synthetic");

        // Check Tire Rotation
        const tireRotation = store.records.find(
            (r) => r.type === "TIRE_ROTATION",
        );
        expect(tireRotation?.treadDepthRemaining).toBe(5.5);
    });

    it("throws an error and does not update state if the database insert fails", async () => {
        const store = useRecordStore();
        store.records = []; // Start empty

        const newRecord: MaintenanceRecord = {
            id: "rec_error",
            vehicleId: "veh_1",
            type: "REPAIR",
            date: "2026-08-01",
            mileage: 100,
            partReplaced: "Battery",
        };

        // Force the mock database to throw an error
        mockDb.run.mockRejectedValue(
            new Error("Database disk image is malformed"),
        );

        // Verify that the store successfully throws the error up to the UI
        await expect(store.addRecord(newRecord)).rejects.toThrow(
            "Database disk image is malformed",
        );

        // Verify the local state remained empty (it didn't falsely add the record)
        expect(store.records.length).toBe(0);
    });

    it("sorts records chronologically when a new record is added", async () => {
        const store = useRecordStore();

        // Seed the store with an older record
        store.records = [
            {
                id: "rec_old",
                vehicleId: "veh_1",
                type: "REPAIR",
                date: "2025-01-01T10:00:00.000Z",
                mileage: 10,
                partReplaced: "Wipers",
            },
        ];

        const newRecord: MaintenanceRecord = {
            id: "rec_new",
            vehicleId: "veh_1",
            type: "REPAIR",
            date: "2026-08-01T10:00:00.000Z", // This date is NEWER
            mileage: 20,
            partReplaced: "Battery",
        };

        mockDb.run.mockResolvedValue();

        await store.addRecord(newRecord);

        // Because we sort descending (newest first), the newly added record should be at index 0
        expect(store.records[0].id).toBe("rec_new");
        expect(store.records[1].id).toBe("rec_old");
    });

    it("updates an OIL_CHANGE record across all three database tables", async () => {
        const store = useRecordStore();

        // Seed the store with the original record
        store.records = [
            {
                id: "rec_oil_1",
                vehicleId: "veh_1",
                type: "OIL_CHANGE",
                date: "2026-01-01",
                mileage: 10000,
                filterReplaced: false,
            },
        ];

        // The updated values
        const updatedRecord: MaintenanceRecord = {
            id: "rec_oil_1",
            vehicleId: "veh_1",
            type: "OIL_CHANGE",
            date: "2026-01-01",
            mileage: 10000,
            filterReplaced: true, // Changed
            oilType: "Full Synthetic", // Added
            nextServiceMileage: 15000, // Added
        };

        mockDb.run.mockResolvedValue();

        await store.updateRecord(updatedRecord);

        // Verify 5 queries ran: BEGIN, Base, Preventative, Oil Change, COMMIT
        expect(mockDb.run).toHaveBeenCalledTimes(5);

        // 1. Transaction started
        expect(mockDb.run.mock.calls[0][0]).toContain("BEGIN TRANSACTION");

        // 2. Base table updated
        expect(mockDb.run.mock.calls[1][0]).toContain(
            "UPDATE maintenance_records",
        );
        expect(mockDb.run.mock.calls[1][1]).toEqual([
            "2026-01-01",
            10000,
            null,
            null,
            null,
            "rec_oil_1",
        ]);

        // 3. Preventative table updated
        expect(mockDb.run.mock.calls[2][0]).toContain(
            "UPDATE preventative_records",
        );
        expect(mockDb.run.mock.calls[2][1]).toEqual([15000, null, "rec_oil_1"]);

        // 4. Oil Change table updated
        expect(mockDb.run.mock.calls[3][0]).toContain(
            "UPDATE oil_change_records",
        );
        expect(mockDb.run.mock.calls[3][1]).toEqual([
            1,
            "Full Synthetic",
            "rec_oil_1", // 1 represents true
        ]);

        // 5. Transaction committed
        expect(mockDb.run.mock.calls[4][0]).toContain("COMMIT");

        // Verify local Vue state updated
        const localRecord = store.records[0];
        if (localRecord.type === "OIL_CHANGE") {
            expect(localRecord.filterReplaced).toBe(true);
            expect(localRecord.oilType).toBe("Full Synthetic");
        }
    });

    it("updates a REPAIR record across the base and repair tables only", async () => {
        const store = useRecordStore();

        store.records = [
            {
                id: "rec_rep_1",
                vehicleId: "veh_1",
                type: "REPAIR",
                date: "2026-01-01",
                mileage: 50000,
                partReplaced: "Alternator",
            },
        ];

        const updatedRecord: MaintenanceRecord = {
            id: "rec_rep_1",
            vehicleId: "veh_1",
            type: "REPAIR",
            date: "2026-01-01",
            mileage: 50000,
            partReplaced: "Alternator & Belt", // Changed
            cost: 450.0, // Added
        };

        mockDb.run.mockResolvedValue();

        // Reset the mock counter before this specific test runs
        mockDb.run.mockClear();

        await store.updateRecord(updatedRecord);

        // Verify only 4 queries ran: BEGIN, Base, Repair, COMMIT (skipped preventative)
        expect(mockDb.run).toHaveBeenCalledTimes(4);

        expect(mockDb.run.mock.calls[1][0]).toContain(
            "UPDATE maintenance_records",
        );
        expect(mockDb.run.mock.calls[1][1]).toContain(450.0); // Verify cost got mapped

        expect(mockDb.run.mock.calls[2][0]).toContain("UPDATE repair_records");
        expect(mockDb.run.mock.calls[2][1]).toEqual([
            "Alternator & Belt",
            "rec_rep_1",
        ]);

        expect(mockDb.run.mock.calls[3][0]).toContain("COMMIT");
    });
});
