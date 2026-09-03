import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMaintenanceSchedule,
    deleteMaintenanceSchedule,
    loadMaintenanceSchedules,
    updateMaintenanceSchedule,
} from "@/services/maintenanceScheduleRepository";
import { useMaintenanceScheduleStore } from "@/store/maintenanceScheduleStore";
import type { MaintenanceSchedule } from "@/types";

vi.mock("@/services/maintenanceScheduleRepository", () => ({
    createMaintenanceSchedule: vi.fn(),
    deleteMaintenanceSchedule: vi.fn(),
    loadMaintenanceSchedules: vi.fn(),
    updateMaintenanceSchedule: vi.fn(),
}));

const schedule: MaintenanceSchedule = {
    id: "schedule-1",
    vehicleId: "vehicle-1",
    serviceType: "OIL_CHANGE",
    intervalMileage: 5_000,
    nextDueMileage: 50_000,
    enabled: true,
};

describe("maintenance schedule store", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it("loads and replaces one vehicle's schedules", async () => {
        vi.mocked(loadMaintenanceSchedules).mockResolvedValue([schedule]);
        const store = useMaintenanceScheduleStore();
        store.schedules = [
            { ...schedule, id: "other-vehicle", vehicleId: "vehicle-2" },
        ];

        await store.loadSchedules("vehicle-1");

        expect(store.schedules).toEqual([
            expect.objectContaining({ id: "other-vehicle" }),
            schedule,
        ]);
    });

    it("updates visible state after create, disable, and delete", async () => {
        vi.mocked(createMaintenanceSchedule).mockResolvedValue(schedule);
        vi.mocked(updateMaintenanceSchedule).mockImplementation(
            async (updated) => updated,
        );
        vi.mocked(deleteMaintenanceSchedule).mockResolvedValue(undefined);
        const store = useMaintenanceScheduleStore();

        await store.addSchedule(schedule);
        expect(store.schedules).toEqual([schedule]);

        await store.setScheduleEnabled(schedule, false);
        expect(store.schedules[0].enabled).toBe(false);

        await store.deleteSchedule(schedule.id);
        expect(store.schedules).toEqual([]);
    });

    it("keeps state unchanged and exposes persistence errors", async () => {
        vi.mocked(updateMaintenanceSchedule).mockRejectedValue(
            new Error("database locked"),
        );
        const store = useMaintenanceScheduleStore();
        store.schedules = [schedule];

        await expect(
            store.updateSchedule({ ...schedule, nextDueMileage: 55_000 }),
        ).rejects.toThrow("database locked");

        expect(store.schedules).toEqual([schedule]);
        expect(store.error).toBe("database locked");
    });
});
