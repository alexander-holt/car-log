import {
    SERVICE_TYPES,
    type MaintenanceDueState,
    type MaintenanceSchedule,
} from "@/types";
import {
    isValidDateOnly,
    normalizeOptionalText,
    parseLocalDate,
    type ValidationIssue,
} from "@/services/serviceRecordValidation";

const MILLISECONDS_PER_DAY = 86_400_000;

export const DEFAULT_MAINTENANCE_LEAD_MILEAGE = 500;
export const DEFAULT_MAINTENANCE_LEAD_DAYS = 14;

const STATE_RANK: Record<MaintenanceDueState, number> = {
    UPCOMING: 0,
    DUE_SOON: 1,
    OVERDUE: 2,
};

function calendarDayNumber(value: string): number {
    const date = parseLocalDate(value);
    return (
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
        MILLISECONDS_PER_DAY
    );
}

export function daysUntilLocalDate(target: string, today: string): number {
    return calendarDayNumber(target) - calendarDayNumber(today);
}

function mostUrgent(
    first: MaintenanceDueState,
    second: MaintenanceDueState,
): MaintenanceDueState {
    return STATE_RANK[first] >= STATE_RANK[second] ? first : second;
}

function mileageState(
    schedule: MaintenanceSchedule,
    currentMileage: number | undefined,
): MaintenanceDueState {
    if (schedule.nextDueMileage === undefined || currentMileage === undefined) {
        return "UPCOMING";
    }
    if (currentMileage >= schedule.nextDueMileage) {
        return "OVERDUE";
    }

    const lead =
        schedule.reminderLeadMileage ?? DEFAULT_MAINTENANCE_LEAD_MILEAGE;
    return currentMileage >= schedule.nextDueMileage - lead
        ? "DUE_SOON"
        : "UPCOMING";
}

function dateState(
    schedule: MaintenanceSchedule,
    today: string,
): MaintenanceDueState {
    if (!schedule.nextDueDate) {
        return "UPCOMING";
    }

    const remainingDays = daysUntilLocalDate(schedule.nextDueDate, today);
    if (remainingDays <= 0) {
        return "OVERDUE";
    }

    return remainingDays <=
        (schedule.reminderLeadDays ?? DEFAULT_MAINTENANCE_LEAD_DAYS)
        ? "DUE_SOON"
        : "UPCOMING";
}

export function getMaintenanceDueState(
    schedule: MaintenanceSchedule,
    currentMileage: number | undefined,
    today: string,
): MaintenanceDueState {
    if (!schedule.enabled) {
        return "UPCOMING";
    }
    return mostUrgent(
        mileageState(schedule, currentMileage),
        dateState(schedule, today),
    );
}

export function addMonthsToLocalDate(value: string, months: number): string {
    const source = parseLocalDate(value);
    const targetMonth = source.getMonth() + months;
    const targetYear = source.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const finalDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const target = new Date(
        targetYear,
        normalizedMonth,
        Math.min(source.getDate(), finalDay),
    );

    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function advanceMaintenanceSchedule(
    schedule: MaintenanceSchedule,
    serviceItemId: string,
    serviceDate: string,
    serviceMileage: number,
): MaintenanceSchedule {
    return {
        ...schedule,
        nextDueMileage:
            schedule.intervalMileage === undefined
                ? schedule.nextDueMileage
                : serviceMileage + schedule.intervalMileage,
        nextDueDate:
            schedule.intervalMonths === undefined
                ? schedule.nextDueDate
                : addMonthsToLocalDate(serviceDate, schedule.intervalMonths),
        lastCompletedServiceItemId: serviceItemId,
    };
}

export function scheduleName(schedule: MaintenanceSchedule): string {
    if (schedule.serviceType === "OTHER") {
        return schedule.label ?? "Other";
    }

    const label = schedule.serviceType.toLowerCase().replaceAll("_", " ");
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function normalizeMaintenanceSchedule(
    schedule: MaintenanceSchedule,
): MaintenanceSchedule {
    return {
        ...schedule,
        label: normalizeOptionalText(schedule.label ?? ""),
    };
}

function validateOptionalWholeNumber(
    value: number | undefined,
    path: string,
    message: string,
    allowZero: boolean,
): ValidationIssue | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!Number.isSafeInteger(value) || (allowZero ? value < 0 : value <= 0)) {
        return { path, message };
    }
    return undefined;
}

export function validateMaintenanceSchedule(
    schedule: MaintenanceSchedule,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const wholeNumbers = [
        validateOptionalWholeNumber(
            schedule.intervalMileage,
            "intervalMileage",
            "Mileage interval must be a whole number greater than zero.",
            false,
        ),
        validateOptionalWholeNumber(
            schedule.intervalMonths,
            "intervalMonths",
            "Time interval must be a whole number of months greater than zero.",
            false,
        ),
        validateOptionalWholeNumber(
            schedule.nextDueMileage,
            "nextDueMileage",
            "Next due mileage must be a whole number zero or greater.",
            true,
        ),
        validateOptionalWholeNumber(
            schedule.reminderLeadMileage,
            "reminderLeadMileage",
            "Mileage reminder lead must be a whole number zero or greater.",
            true,
        ),
        validateOptionalWholeNumber(
            schedule.reminderLeadDays,
            "reminderLeadDays",
            "Date reminder lead must be a whole number of days zero or greater.",
            true,
        ),
    ];
    issues.push(
        ...wholeNumbers.filter(
            (issue): issue is ValidationIssue => issue !== undefined,
        ),
    );

    if (!schedule.id.trim()) {
        issues.push({ path: "id", message: "Schedule ID is required." });
    }
    if (!schedule.vehicleId.trim()) {
        issues.push({ path: "vehicleId", message: "Vehicle is required." });
    }
    if (!SERVICE_TYPES.includes(schedule.serviceType)) {
        issues.push({
            path: "serviceType",
            message: "Choose a valid service category.",
        });
    }
    if (
        schedule.serviceType === "OTHER" &&
        normalizeOptionalText(schedule.label ?? "") === undefined
    ) {
        issues.push({
            path: "label",
            message: "Enter a label for Other maintenance.",
        });
    }
    if ((schedule.label?.trim().length ?? 0) > 120) {
        issues.push({
            path: "label",
            message: "Schedule label must be 120 characters or fewer.",
        });
    }
    if (
        schedule.nextDueMileage === undefined &&
        schedule.nextDueDate === undefined
    ) {
        issues.push({
            path: "nextDue",
            message: "Enter a next due mileage, a next due date, or both.",
        });
    }
    if (
        schedule.intervalMileage !== undefined &&
        schedule.nextDueMileage === undefined
    ) {
        issues.push({
            path: "nextDueMileage",
            message: "Enter the next due mileage for this interval.",
        });
    }
    if (
        schedule.intervalMonths !== undefined &&
        schedule.nextDueDate === undefined
    ) {
        issues.push({
            path: "nextDueDate",
            message: "Enter the next due date for this interval.",
        });
    }
    if (
        schedule.nextDueMileage !== undefined &&
        schedule.intervalMileage === undefined
    ) {
        issues.push({
            path: "intervalMileage",
            message: "Enter how often this service repeats by mileage.",
        });
    }
    if (
        schedule.nextDueDate !== undefined &&
        schedule.intervalMonths === undefined
    ) {
        issues.push({
            path: "intervalMonths",
            message: "Enter how often this service repeats by month.",
        });
    }
    if (
        schedule.reminderLeadMileage !== undefined &&
        schedule.nextDueMileage === undefined
    ) {
        issues.push({
            path: "reminderLeadMileage",
            message: "A mileage warning requires a next due mileage.",
        });
    }
    if (
        schedule.reminderLeadDays !== undefined &&
        schedule.nextDueDate === undefined
    ) {
        issues.push({
            path: "reminderLeadDays",
            message: "A date warning requires a next due date.",
        });
    }
    if (
        schedule.nextDueDate !== undefined &&
        !isValidDateOnly(schedule.nextDueDate)
    ) {
        issues.push({
            path: "nextDueDate",
            message: "Enter a valid due date in YYYY-MM-DD format.",
        });
    }

    return issues;
}

export function assertValidMaintenanceSchedule(
    schedule: MaintenanceSchedule,
): void {
    const issue = validateMaintenanceSchedule(schedule)[0];
    if (issue) {
        throw new Error(issue.message);
    }
}

export function compareMaintenanceUrgency(
    first: MaintenanceSchedule,
    second: MaintenanceSchedule,
    currentMileage: number | undefined,
    today: string,
): number {
    const stateDifference =
        STATE_RANK[getMaintenanceDueState(second, currentMileage, today)] -
        STATE_RANK[getMaintenanceDueState(first, currentMileage, today)];
    if (stateDifference !== 0) {
        return stateDifference;
    }

    if (first.nextDueDate && second.nextDueDate) {
        const dateDifference = first.nextDueDate.localeCompare(
            second.nextDueDate,
        );
        if (dateDifference !== 0) {
            return dateDifference;
        }
    } else if (first.nextDueDate || second.nextDueDate) {
        return first.nextDueDate ? -1 : 1;
    }

    return (
        (first.nextDueMileage ?? Number.POSITIVE_INFINITY) -
        (second.nextDueMileage ?? Number.POSITIVE_INFINITY)
    );
}
