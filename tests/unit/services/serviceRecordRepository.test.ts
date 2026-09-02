import {
    createServiceRecord,
    deleteServiceRecord,
    loadServiceRecords,
    mapServiceRecordRows,
    type ServiceRecordDatabase,
    updateServiceRecord,
} from "@/services/serviceRecordRepository";
import type { ServiceRecord } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRecord(): ServiceRecord {
    return {
        id: "record-1",
        vehicleId: "vehicle-1",
        date: "2026-08-31",
        mileage: 45_000,
        providerType: "DIY",
        totalCostCents: 12_345,
        items: [
            {
                id: "oil",
                serviceRecordId: "record-1",
                serviceType: "OIL_CHANGE",
                filterReplaced: true,
                oilType: "0W-20",
            },
            {
                id: "inspection",
                serviceRecordId: "record-1",
                serviceType: "INSPECTION",
                notes: "Passed",
            },
        ],
    };
}

describe("service record repository", () => {
    let db: ServiceRecordDatabase;
    let query: ReturnType<typeof vi.fn>;
    let run: ReturnType<typeof vi.fn>;
    let beginTransaction: ReturnType<typeof vi.fn>;
    let commitTransaction: ReturnType<typeof vi.fn>;
    let rollbackTransaction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        query = vi.fn();
        run = vi.fn().mockResolvedValue({ changes: { changes: 1 } });
        beginTransaction = vi.fn().mockResolvedValue({});
        commitTransaction = vi.fn().mockResolvedValue({});
        rollbackTransaction = vi.fn().mockResolvedValue({});
        db = {
            query,
            run,
            beginTransaction,
            commitTransaction,
            rollbackTransaction,
        } as unknown as ServiceRecordDatabase;
    });

    it("groups a mixed query result into one record with ordered items", async () => {
        query.mockResolvedValue({
            values: [
                {
                    recordId: "record-1",
                    vehicleId: "vehicle-1",
                    date: "2026-08-31",
                    mileage: 45_000,
                    providerType: "SHOP",
                    providerName: "Honest Auto",
                    totalCostCents: 20_000,
                    recordNotes: null,
                    itemId: "oil",
                    serviceType: "OIL_CHANGE",
                    itemTitle: null,
                    itemNotes: null,
                    scheduleId: null,
                    oilType: "0W-20",
                    filterReplaced: 1,
                    treadDepthRemaining: null,
                },
                {
                    recordId: "record-1",
                    vehicleId: "vehicle-1",
                    date: "2026-08-31",
                    mileage: 45_000,
                    providerType: "SHOP",
                    providerName: "Honest Auto",
                    totalCostCents: 20_000,
                    recordNotes: null,
                    itemId: "repair",
                    serviceType: "REPAIR",
                    itemTitle: "Serpentine belt",
                    itemNotes: "Cracked",
                    scheduleId: null,
                    oilType: null,
                    filterReplaced: null,
                    treadDepthRemaining: null,
                },
            ],
        });

        const records = await loadServiceRecords("vehicle-1", db);

        expect(query).toHaveBeenCalledWith(
            expect.stringContaining("FROM service_records"),
            ["vehicle-1"],
        );
        expect(records).toHaveLength(1);
        expect(records[0].items.map((item) => item.id)).toEqual([
            "oil",
            "repair",
        ]);
        expect(records[0].items[0]).toEqual(
            expect.objectContaining({
                serviceType: "OIL_CHANGE",
                oilType: "0W-20",
                filterReplaced: true,
            }),
        );
    });

    it("maps an empty result without records", () => {
        expect(mapServiceRecordRows([])).toEqual([]);
    });

    it("creates the parent, items, details, and mileage in one transaction", async () => {
        await createServiceRecord(makeRecord(), db);

        expect(beginTransaction).toHaveBeenCalledOnce();
        expect(commitTransaction).toHaveBeenCalledOnce();
        expect(rollbackTransaction).not.toHaveBeenCalled();
        expect(run.mock.calls.map((call) => call[0])).toEqual(
            expect.arrayContaining([
                expect.stringContaining("INSERT INTO service_records"),
                expect.stringContaining("INSERT INTO service_items"),
                expect.stringContaining("INSERT INTO oil_change_details"),
                expect.stringContaining("UPDATE vehicles"),
            ]),
        );
        const mileageCall = run.mock.calls.find((call) =>
            String(call[0]).includes("UPDATE vehicles"),
        );
        expect(mileageCall?.[1]).toEqual([
            45_000,
            expect.any(String),
            expect.any(String),
            "vehicle-1",
            45_000,
        ]);
    });

    it("rolls back and preserves the original write failure", async () => {
        run.mockRejectedValueOnce(new Error("disk full"));

        await expect(createServiceRecord(makeRecord(), db)).rejects.toThrow(
            "disk full",
        );
        expect(rollbackTransaction).toHaveBeenCalledOnce();
        expect(commitTransaction).not.toHaveBeenCalled();
    });

    it("updates items by ID, deletes removed items, and leaves siblings present", async () => {
        query.mockResolvedValue({
            values: [{ id: "oil" }, { id: "inspection" }, { id: "removed" }],
        });
        const record = makeRecord();
        record.items[0] = {
            id: "oil",
            serviceRecordId: "record-1",
            serviceType: "OIL_CHANGE",
            filterReplaced: false,
            oilType: "5W-30",
        };

        await updateServiceRecord(record, db);

        expect(run).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM service_items"),
            ["removed", "record-1"],
            false,
        );
        const itemUpdates = run.mock.calls.filter((call) =>
            String(call[0]).includes("UPDATE service_items"),
        );
        expect(itemUpdates.map((call) => call[1][5])).toEqual([
            "oil",
            "inspection",
        ]);
        expect(commitTransaction).toHaveBeenCalledOnce();
    });

    it("rolls back when the record does not belong to the vehicle", async () => {
        run.mockResolvedValueOnce({ changes: { changes: 0 } });

        await expect(updateServiceRecord(makeRecord(), db)).rejects.toThrow(
            "Service record was not found for this vehicle.",
        );

        expect(query).not.toHaveBeenCalled();
        expect(rollbackTransaction).toHaveBeenCalledOnce();
        expect(commitTransaction).not.toHaveBeenCalled();
    });

    it("deletes the parent record inside a transaction", async () => {
        await deleteServiceRecord("record-1", db);

        expect(beginTransaction).toHaveBeenCalledOnce();
        expect(run).toHaveBeenCalledWith(
            "DELETE FROM service_records WHERE id = ?;",
            ["record-1"],
            false,
        );
        expect(commitTransaction).toHaveBeenCalledOnce();
    });
});
