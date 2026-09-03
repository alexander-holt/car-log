import { describe, expect, it } from "vitest";
import {
    addMonthsToLocalDate,
    advanceMaintenanceSchedule,
    getMaintenanceDueState,
    validateMaintenanceSchedule,
} from "@/services/maintenanceScheduleService";
import type { MaintenanceSchedule } from "@/types";

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

describe("maintenance due states", () => {
    it("uses exact mileage boundaries", () => {
        const mileageSchedule = schedule();

        expect(
            getMaintenanceDueState(mileageSchedule, 48_999, "2026-09-03"),
        ).toBe("UPCOMING");
        expect(
            getMaintenanceDueState(mileageSchedule, 49_000, "2026-09-03"),
        ).toBe("DUE_SOON");
        expect(
            getMaintenanceDueState(mileageSchedule, 49_999, "2026-09-03"),
        ).toBe("DUE_SOON");
        expect(
            getMaintenanceDueState(mileageSchedule, 50_000, "2026-09-03"),
        ).toBe("OVERDUE");
    });

    it("uses the default mileage and date warning windows", () => {
        const mileageSchedule = schedule({ reminderLeadMileage: undefined });
        expect(
            getMaintenanceDueState(mileageSchedule, 49_499, "2026-09-03"),
        ).toBe("UPCOMING");
        expect(
            getMaintenanceDueState(mileageSchedule, 49_500, "2026-09-03"),
        ).toBe("DUE_SOON");

        const dateSchedule = schedule({
            intervalMileage: undefined,
            nextDueMileage: undefined,
            reminderLeadMileage: undefined,
            intervalMonths: 6,
            nextDueDate: "2026-10-03",
            reminderLeadDays: undefined,
        });
        expect(getMaintenanceDueState(dateSchedule, 0, "2026-09-18")).toBe(
            "UPCOMING",
        );
        expect(getMaintenanceDueState(dateSchedule, 0, "2026-09-19")).toBe(
            "DUE_SOON",
        );
    });

    it("uses exact local-calendar date boundaries", () => {
        const dateSchedule = schedule({
            intervalMileage: undefined,
            nextDueMileage: undefined,
            reminderLeadMileage: undefined,
            intervalMonths: 6,
            nextDueDate: "2026-10-03",
            reminderLeadDays: 14,
        });

        expect(getMaintenanceDueState(dateSchedule, 49_000, "2026-09-18")).toBe(
            "UPCOMING",
        );
        expect(getMaintenanceDueState(dateSchedule, 49_000, "2026-09-19")).toBe(
            "DUE_SOON",
        );
        expect(getMaintenanceDueState(dateSchedule, 49_000, "2026-10-02")).toBe(
            "DUE_SOON",
        );
        expect(getMaintenanceDueState(dateSchedule, 49_000, "2026-10-03")).toBe(
            "OVERDUE",
        );
    });

    it("uses the more urgent threshold on combined schedules", () => {
        const combined = schedule({
            intervalMonths: 6,
            nextDueDate: "2027-01-01",
            reminderLeadDays: 14,
        });

        expect(getMaintenanceDueState(combined, 49_000, "2026-09-03")).toBe(
            "DUE_SOON",
        );
        expect(getMaintenanceDueState(combined, 40_000, "2027-01-01")).toBe(
            "OVERDUE",
        );
    });

    it("ignores mileage thresholds when vehicle mileage is unknown", () => {
        const combined = schedule({
            nextDueDate: "2026-12-01",
            intervalMonths: 6,
            reminderLeadDays: 14,
        });

        expect(getMaintenanceDueState(combined, undefined, "2026-09-03")).toBe(
            "UPCOMING",
        );
        expect(getMaintenanceDueState(combined, undefined, "2026-11-17")).toBe(
            "DUE_SOON",
        );
    });
});

describe("maintenance schedule advancement", () => {
    it("advances mileage and date intervals from the completed service", () => {
        const advanced = advanceMaintenanceSchedule(
            schedule({
                intervalMonths: 6,
                nextDueDate: "2026-09-01",
            }),
            "item-1",
            "2026-09-03",
            50_250,
        );

        expect(advanced).toEqual(
            expect.objectContaining({
                nextDueMileage: 55_250,
                nextDueDate: "2027-03-03",
                lastCompletedServiceItemId: "item-1",
            }),
        );
    });

    it("clamps month-end dates without parsing them as UTC timestamps", () => {
        expect(addMonthsToLocalDate("2027-01-31", 1)).toBe("2027-02-28");
        expect(addMonthsToLocalDate("2028-01-31", 1)).toBe("2028-02-29");
    });
});

describe("maintenance schedule validation", () => {
    it("requires at least one next-due value", () => {
        const issues = validateMaintenanceSchedule(
            schedule({ intervalMileage: undefined, nextDueMileage: undefined }),
        );

        expect(issues).toContainEqual({
            path: "nextDue",
            message: "Enter a next due mileage, a next due date, or both.",
        });
    });

    it("requires mileage due values and intervals as a pair", () => {
        expect(
            validateMaintenanceSchedule(
                schedule({ intervalMileage: undefined }),
            ),
        ).toContainEqual({
            path: "intervalMileage",
            message: "Enter how often this service repeats by mileage.",
        });
        expect(
            validateMaintenanceSchedule(
                schedule({ nextDueMileage: undefined }),
            ),
        ).toContainEqual({
            path: "nextDueMileage",
            message: "Enter the next due mileage for this interval.",
        });
    });

    it("requires date due values and intervals as a pair", () => {
        expect(
            validateMaintenanceSchedule(
                schedule({
                    intervalMileage: undefined,
                    nextDueMileage: undefined,
                    intervalMonths: undefined,
                    nextDueDate: "2027-03-03",
                }),
            ),
        ).toContainEqual({
            path: "intervalMonths",
            message: "Enter how often this service repeats by month.",
        });
        expect(
            validateMaintenanceSchedule(
                schedule({
                    intervalMileage: undefined,
                    nextDueMileage: undefined,
                    intervalMonths: 6,
                }),
            ),
        ).toContainEqual({
            path: "nextDueDate",
            message: "Enter the next due date for this interval.",
        });
    });

    it("rejects warning overrides without matching due values", () => {
        const issues = validateMaintenanceSchedule(
            schedule({
                intervalMileage: undefined,
                nextDueMileage: undefined,
                reminderLeadMileage: 1_000,
                intervalMonths: 6,
                nextDueDate: "2027-03-03",
            }),
        );

        expect(issues).toContainEqual({
            path: "reminderLeadMileage",
            message: "A mileage warning requires a next due mileage.",
        });
    });

    it("requires a valid label for Other maintenance", () => {
        const issues = validateMaintenanceSchedule(
            schedule({ serviceType: "OTHER", label: " " }),
        );

        expect(issues).toContainEqual({
            path: "label",
            message: "Enter a label for Other maintenance.",
        });
    });
});
