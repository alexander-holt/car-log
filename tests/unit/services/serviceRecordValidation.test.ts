import {
    formatLocalDate,
    getLocalDateString,
    isValidDateOnly,
    normalizeVin,
    parseCostToCents,
    validateServiceRecord,
    validateVin,
    validateVehicle,
} from "@/services/serviceRecordValidation";
import type { ServiceRecord } from "@/types";
import { describe, expect, it } from "vitest";

function makeRecord(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
    const id = overrides.id ?? "record-1";
    return {
        id,
        vehicleId: "vehicle-1",
        date: "2026-08-31",
        mileage: 45_000,
        providerType: "DIY",
        items: [
            {
                id: "item-1",
                serviceRecordId: id,
                serviceType: "INSPECTION",
            },
        ],
        ...overrides,
    };
}

describe("service record validation", () => {
    it("accepts a mixed DIY record without a provider name", () => {
        const record = makeRecord({
            items: [
                {
                    id: "oil",
                    serviceRecordId: "record-1",
                    serviceType: "OIL_CHANGE",
                    oilType: "0W-20 synthetic",
                    filterReplaced: true,
                },
                {
                    id: "tires",
                    serviceRecordId: "record-1",
                    serviceType: "TIRE_REPLACEMENT",
                    treadDepthRemaining: 10,
                },
                {
                    id: "other",
                    serviceRecordId: "record-1",
                    serviceType: "OTHER",
                    title: "Differential fluid",
                },
            ],
        });

        expect(validateServiceRecord(record, "2026-09-01")).toEqual([]);
    });

    it("rejects invalid dates, mileage, costs, empty items, and future dates", () => {
        expect(
            validateServiceRecord(
                makeRecord({
                    date: "2026-02-30",
                    mileage: -1,
                    totalCostCents: 12.5,
                    items: [],
                }),
                "2026-09-01",
            ).map((issue) => issue.path),
        ).toEqual(["date", "mileage", "totalCostCents", "items"]);

        expect(
            validateServiceRecord(
                makeRecord({ date: "2026-09-02" }),
                "2026-09-01",
            )[0].message,
        ).toBe("Service date cannot be in the future.");
    });

    it("validates Other titles and tire structured details", () => {
        const record = makeRecord({
            items: [
                {
                    id: "other",
                    serviceRecordId: "record-1",
                    serviceType: "OTHER",
                    title: " ",
                },
                {
                    id: "tires",
                    serviceRecordId: "record-1",
                    serviceType: "TIRE_ROTATION",
                    treadDepthRemaining: 33,
                },
            ],
        });

        expect(validateServiceRecord(record, "2026-09-01")).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ path: "items.0.title" }),
                expect.objectContaining({
                    path: "items.1.treadDepthRemaining",
                }),
            ]),
        );
    });

    it("parses dollar values into exact integer cents", () => {
        expect(parseCostToCents(0)).toBe(0);
        expect(parseCostToCents("12.34")).toBe(1234);
        expect(parseCostToCents("")).toBeUndefined();
        expect(() => parseCostToCents("12.345")).toThrow(/two decimals/);
        expect(() => parseCostToCents("-1")).toThrow(/zero or greater/);
    });

    it("handles date-only values in the local calendar", () => {
        expect(isValidDateOnly("2024-02-29")).toBe(true);
        expect(isValidDateOnly("2025-02-29")).toBe(false);
        expect(formatLocalDate("2026-08-31")).toMatch(/2026/);
        expect(getLocalDateString(new Date(2026, 8, 1, 23, 59))).toBe(
            "2026-09-01",
        );
    });

    it("normalizes and validates VINs", () => {
        expect(normalizeVin(" 1hgcm82633a004352 ")).toBe("1HGCM82633A004352");
        expect(validateVin("1HGCM82633A004352")).toBeUndefined();
        expect(validateVin("1HGCM82633A00435I")).toMatch(/cannot contain/);
        expect(
            validateVehicle({
                make: "Honda",
                model: "Accord",
                year: 2026,
                currentMileage: 1.5,
            }),
        ).toEqual([expect.objectContaining({ path: "currentMileage" })]);
    });
});
