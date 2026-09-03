import {
    SERVICE_TYPES,
    type ServiceItem,
    type ServiceRecord,
    type Vehicle,
} from "@/types";

export interface ValidationIssue {
    path: string;
    message: string;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const COST_PATTERN = /^\d+(?:\.\d{1,2})?$/;

export function getLocalDateString(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function isValidDateOnly(value: string): boolean {
    const match = DATE_ONLY_PATTERN.exec(value);
    if (!match) {
        return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    return (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
    );
}

export function parseLocalDate(value: string): Date {
    if (!isValidDateOnly(value)) {
        throw new Error(
            "Date must be a valid calendar date in YYYY-MM-DD format.",
        );
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function formatLocalDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(parseLocalDate(value));
}

export function parseCostToCents(
    value: string | number | null | undefined,
): number | undefined {
    if (value === null || value === undefined || String(value).trim() === "") {
        return undefined;
    }

    const normalized = String(value).trim();
    if (!COST_PATTERN.test(normalized)) {
        throw new Error(
            "Cost must be zero or greater with at most two decimals.",
        );
    }

    const cents = Math.round(Number(normalized) * 100);
    if (!Number.isSafeInteger(cents)) {
        throw new Error("Cost is too large.");
    }

    return cents;
}

export function formatCost(totalCostCents: number): string {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
    }).format(totalCostCents / 100);
}

export function normalizeOptionalText(value: string): string | undefined {
    const normalized = value.trim();
    return normalized === "" ? undefined : normalized;
}

export function normalizeVin(value: string): string | undefined {
    const normalized = value.trim().toUpperCase();
    return normalized === "" ? undefined : normalized;
}

export function validateVin(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    return VIN_PATTERN.test(value.trim().toUpperCase())
        ? undefined
        : "VIN must be 17 characters and cannot contain I, O, or Q.";
}

export function validateVehicle(
    vehicle: Omit<Vehicle, "id">,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (vehicle.make.trim() === "") {
        issues.push({ path: "make", message: "Make is required." });
    }
    if (vehicle.model.trim() === "") {
        issues.push({ path: "model", message: "Model is required." });
    }
    if (!Number.isInteger(vehicle.year) || vehicle.year < 1886) {
        issues.push({ path: "year", message: "Enter a valid vehicle year." });
    }
    if (
        vehicle.currentMileage !== undefined &&
        (!Number.isSafeInteger(vehicle.currentMileage) ||
            vehicle.currentMileage < 0)
    ) {
        issues.push({
            path: "currentMileage",
            message: "Mileage must be a whole number zero or greater.",
        });
    }
    if (
        vehicle.mileageReminderIntervalDays !== undefined &&
        (!Number.isSafeInteger(vehicle.mileageReminderIntervalDays) ||
            vehicle.mileageReminderIntervalDays <= 0)
    ) {
        issues.push({
            path: "mileageReminderIntervalDays",
            message:
                "Reminder interval must be a whole number of days greater than zero.",
        });
    }

    const vinError = validateVin(vehicle.vin);
    if (vinError) {
        issues.push({ path: "vin", message: vinError });
    }

    return issues;
}

function validateItem(
    item: ServiceItem,
    record: ServiceRecord,
    index: number,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const path = `items.${index}`;

    if (!item.id.trim()) {
        issues.push({
            path: `${path}.id`,
            message: "Service item ID is required.",
        });
    }
    if (item.serviceRecordId !== record.id) {
        issues.push({
            path: `${path}.serviceRecordId`,
            message: "Service item does not belong to this record.",
        });
    }
    if (!SERVICE_TYPES.includes(item.serviceType)) {
        issues.push({
            path: `${path}.serviceType`,
            message: "Choose a valid service category.",
        });
    }
    if (item.serviceType === "OTHER" && item.title.trim() === "") {
        issues.push({
            path: `${path}.title`,
            message: "Enter a title for Other service.",
        });
    }
    if (item.title && item.title.trim().length > 120) {
        issues.push({
            path: `${path}.title`,
            message: "Item title must be 120 characters or fewer.",
        });
    }
    if (item.serviceType === "OIL_CHANGE") {
        if (typeof item.filterReplaced !== "boolean") {
            issues.push({
                path: `${path}.filterReplaced`,
                message: "Choose whether the oil filter was replaced.",
            });
        }
        if (item.oilType && item.oilType.trim().length > 100) {
            issues.push({
                path: `${path}.oilType`,
                message: "Oil type must be 100 characters or fewer.",
            });
        }
    }
    if (
        (item.serviceType === "TIRE_ROTATION" ||
            item.serviceType === "TIRE_REPLACEMENT") &&
        item.treadDepthRemaining !== undefined &&
        (!Number.isFinite(item.treadDepthRemaining) ||
            item.treadDepthRemaining < 0 ||
            item.treadDepthRemaining > 32)
    ) {
        issues.push({
            path: `${path}.treadDepthRemaining`,
            message: "Tread depth must be between 0 and 32 thirty-seconds.",
        });
    }

    return issues;
}

export function validateServiceRecord(
    record: ServiceRecord,
    today = getLocalDateString(),
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!record.id.trim()) {
        issues.push({ path: "id", message: "Service record ID is required." });
    }
    if (!record.vehicleId.trim()) {
        issues.push({ path: "vehicleId", message: "Vehicle is required." });
    }
    if (!isValidDateOnly(record.date)) {
        issues.push({
            path: "date",
            message: "Enter a valid service date in YYYY-MM-DD format.",
        });
    } else if (record.date > today) {
        issues.push({
            path: "date",
            message: "Service date cannot be in the future.",
        });
    }
    if (!Number.isSafeInteger(record.mileage) || record.mileage < 0) {
        issues.push({
            path: "mileage",
            message: "Mileage must be a whole number zero or greater.",
        });
    }
    if (record.providerType !== "DIY" && record.providerType !== "SHOP") {
        issues.push({ path: "providerType", message: "Choose DIY or Shop." });
    }
    if (
        record.totalCostCents !== undefined &&
        (!Number.isSafeInteger(record.totalCostCents) ||
            record.totalCostCents < 0)
    ) {
        issues.push({
            path: "totalCostCents",
            message: "Cost must be zero or greater with at most two decimals.",
        });
    }
    if (record.items.length === 0) {
        issues.push({
            path: "items",
            message: "Add at least one service item.",
        });
    }

    const itemIds = new Set<string>();
    record.items.forEach((item, index) => {
        if (itemIds.has(item.id)) {
            issues.push({
                path: `items.${index}.id`,
                message: "Each service item must have a unique ID.",
            });
        }
        itemIds.add(item.id);
        issues.push(...validateItem(item, record, index));
    });

    return issues;
}

export function assertValidServiceRecord(record: ServiceRecord): void {
    const issues = validateServiceRecord(record);
    if (issues.length > 0) {
        throw new Error(issues[0].message);
    }
}
