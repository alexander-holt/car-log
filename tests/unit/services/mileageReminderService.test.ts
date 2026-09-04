import { describe, expect, it } from "vitest";
import { isMileageUpdateDue } from "@/services/mileageReminderService";
import type { Vehicle } from "@/types";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
    return {
        id: "vehicle-1",
        make: "Honda",
        model: "Civic",
        year: 2020,
        currentMileage: 45_000,
        mileageUpdatedAt: "2026-08-01T12:00:00.000Z",
        mileageReminderIntervalDays: 30,
        mileageRemindersEnabled: true,
        ...overrides,
    };
}

describe("mileage update reminders", () => {
    it("turns stale at the exact configured interval boundary", () => {
        expect(
            isMileageUpdateDue(vehicle(), new Date("2026-08-31T11:59:59.999Z")),
        ).toBe(false);
        expect(
            isMileageUpdateDue(vehicle(), new Date("2026-08-31T12:00:00.000Z")),
        ).toBe(true);
    });

    it("prompts for unknown mileage or a missing update timestamp", () => {
        expect(isMileageUpdateDue(vehicle({ currentMileage: undefined }))).toBe(
            true,
        );
        expect(
            isMileageUpdateDue(vehicle({ mileageUpdatedAt: undefined })),
        ).toBe(true);
    });

    it("does not prompt when reminders are disabled", () => {
        expect(
            isMileageUpdateDue(
                vehicle({
                    currentMileage: undefined,
                    mileageRemindersEnabled: false,
                }),
            ),
        ).toBe(false);
    });
});
