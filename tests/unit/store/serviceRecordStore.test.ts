import {
    createServiceRecord,
    deleteServiceRecord,
    loadServiceRecords,
    updateServiceRecord,
} from "@/services/serviceRecordRepository";
import { useServiceRecordStore } from "@/store/serviceRecordStore";
import { useVehicleStore } from "@/store/vehicleStore";
import { useMaintenanceScheduleStore } from "@/store/maintenanceScheduleStore";
import type { ServiceRecord } from "@/types";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/serviceRecordRepository", () => ({
    loadServiceRecords: vi.fn(),
    createServiceRecord: vi.fn(),
    updateServiceRecord: vi.fn(),
    deleteServiceRecord: vi.fn(),
}));

function makeRecord(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
    return {
        id: "record-1",
        vehicleId: "vehicle-1",
        date: "2026-08-31",
        mileage: 45_000,
        providerType: "DIY",
        items: [
            {
                id: "item-1",
                serviceRecordId: "record-1",
                serviceType: "INSPECTION",
            },
        ],
        ...overrides,
    };
}

describe("service record store", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it("exposes loading and stores nested records", async () => {
        const record = makeRecord();
        vi.mocked(loadServiceRecords).mockResolvedValue([record]);
        const store = useServiceRecordStore();

        const request = store.loadRecords("vehicle-1");
        expect(store.loading).toBe(true);
        await request;

        expect(store.loading).toBe(false);
        expect(store.records).toEqual([record]);
        expect(store.error).toBeNull();
    });

    it("surfaces load failures and clears stale history", async () => {
        vi.mocked(loadServiceRecords).mockRejectedValue(
            new Error("read failed"),
        );
        const store = useServiceRecordStore();
        store.records = [makeRecord()];

        await expect(store.loadRecords("vehicle-1")).rejects.toThrow(
            "read failed",
        );

        expect(store.loading).toBe(false);
        expect(store.records).toEqual([]);
        expect(store.error).toBe("read failed");
    });

    it("adds a record, sorts history, and synchronizes newer mileage", async () => {
        vi.mocked(createServiceRecord).mockResolvedValue({
            mileageUpdatedAt: "2026-09-01T12:00:00.000Z",
            advancedSchedules: [
                {
                    id: "schedule-1",
                    vehicleId: "vehicle-1",
                    serviceType: "INSPECTION",
                    intervalMonths: 12,
                    nextDueDate: "2027-08-31",
                    enabled: true,
                    lastCompletedServiceItemId: "item-1",
                },
            ],
        });
        const store = useServiceRecordStore();
        const vehicleStore = useVehicleStore();
        vehicleStore.vehicles = [
            {
                id: "vehicle-1",
                make: "Honda",
                model: "Civic",
                year: 2020,
                currentMileage: 40_000,
            },
        ];
        store.records = [
            makeRecord({ id: "older", date: "2026-01-01", items: [] }),
        ];
        const record = makeRecord();

        await store.addRecord(record);

        expect(store.records.map((entry) => entry.id)).toEqual([
            "record-1",
            "older",
        ]);
        expect(vehicleStore.vehicles[0].currentMileage).toBe(45_000);
        expect(vehicleStore.vehicles[0].mileageUpdatedAt).toBe(
            "2026-09-01T12:00:00.000Z",
        );
        expect(useMaintenanceScheduleStore().schedules).toEqual([
            expect.objectContaining({
                id: "schedule-1",
                nextDueDate: "2027-08-31",
            }),
        ]);
    });

    it("updates one record without changing another record", async () => {
        vi.mocked(updateServiceRecord).mockResolvedValue({});
        const store = useServiceRecordStore();
        const siblingRecord = makeRecord({
            id: "record-2",
            items: [
                {
                    id: "item-2",
                    serviceRecordId: "record-2",
                    serviceType: "REPAIR",
                },
            ],
        });
        store.records = [makeRecord(), siblingRecord];
        const updated = makeRecord({ notes: "Updated" });

        await store.updateRecord(updated);

        expect(
            store.records.find((record) => record.id === "record-1"),
        ).toEqual(updated);
        expect(
            store.records.find((record) => record.id === "record-2"),
        ).toEqual(siblingRecord);
    });

    it("deletes local state only after persistence succeeds", async () => {
        vi.mocked(deleteServiceRecord).mockRejectedValueOnce(
            new Error("delete failed"),
        );
        const store = useServiceRecordStore();
        store.records = [makeRecord()];

        await expect(store.deleteRecord("record-1")).rejects.toThrow(
            "delete failed",
        );
        expect(store.records).toHaveLength(1);

        vi.mocked(deleteServiceRecord).mockResolvedValueOnce();
        await store.deleteRecord("record-1");
        expect(store.records).toEqual([]);
    });

    it("clears deleted schedule links without removing service history", () => {
        const store = useServiceRecordStore();
        store.records = [
            makeRecord({
                items: [
                    {
                        id: "item-1",
                        serviceRecordId: "record-1",
                        serviceType: "INSPECTION",
                        scheduleId: "schedule-1",
                    },
                ],
            }),
        ];

        store.clearScheduleReferences("schedule-1");

        expect(store.records).toHaveLength(1);
        expect(store.records[0].items).toEqual([
            expect.objectContaining({
                id: "item-1",
                scheduleId: undefined,
            }),
        ]);
    });
});
