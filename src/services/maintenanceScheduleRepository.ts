import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { databaseService } from "@/services/databaseService";
import {
    assertValidMaintenanceSchedule,
    normalizeMaintenanceSchedule,
} from "@/services/maintenanceScheduleService";
import type { MaintenanceSchedule, ServiceType } from "@/types";

export type MaintenanceScheduleDatabase = Pick<
    SQLiteDBConnection,
    "query" | "run"
>;

interface MaintenanceScheduleRow {
    id: string;
    vehicleId: string;
    serviceType: ServiceType;
    label: string | null;
    intervalMileage: number | null;
    intervalMonths: number | null;
    nextDueMileage: number | null;
    nextDueDate: string | null;
    reminderLeadMileage: number | null;
    reminderLeadDays: number | null;
    notificationId: number | null;
    enabled: number | boolean;
    lastCompletedServiceItemId: string | null;
}

const SELECT_SCHEDULES = `
    SELECT
        id,
        vehicleId,
        serviceType,
        label,
        intervalMileage,
        intervalMonths,
        nextDueMileage,
        nextDueDate,
        reminderLeadMileage,
        reminderLeadDays,
        notificationId,
        enabled,
        lastCompletedServiceItemId
    FROM maintenance_schedules
`;

function optional<T>(value: T | null): T | undefined {
    return value ?? undefined;
}

export function mapMaintenanceScheduleRow(
    row: MaintenanceScheduleRow,
): MaintenanceSchedule {
    return {
        id: row.id,
        vehicleId: row.vehicleId,
        serviceType: row.serviceType,
        label: optional(row.label),
        intervalMileage: optional(row.intervalMileage),
        intervalMonths: optional(row.intervalMonths),
        nextDueMileage: optional(row.nextDueMileage),
        nextDueDate: optional(row.nextDueDate),
        reminderLeadMileage: optional(row.reminderLeadMileage),
        reminderLeadDays: optional(row.reminderLeadDays),
        notificationId: optional(row.notificationId),
        enabled: row.enabled === true || row.enabled === 1,
        lastCompletedServiceItemId: optional(row.lastCompletedServiceItemId),
    };
}

export async function loadMaintenanceSchedules(
    vehicleId?: string,
    db: MaintenanceScheduleDatabase = databaseService.getDb(),
): Promise<MaintenanceSchedule[]> {
    const response = vehicleId
        ? await db.query(
              `${SELECT_SCHEDULES}
               WHERE vehicleId = ?
               ORDER BY enabled DESC, createdAt, id;`,
              [vehicleId],
          )
        : await db.query(
              `${SELECT_SCHEDULES}
               ORDER BY vehicleId, enabled DESC, createdAt, id;`,
          );

    return (response.values ?? []).map((row) =>
        mapMaintenanceScheduleRow(row as MaintenanceScheduleRow),
    );
}

export async function loadMaintenanceSchedule(
    scheduleId: string,
    db: MaintenanceScheduleDatabase = databaseService.getDb(),
): Promise<MaintenanceSchedule | undefined> {
    const response = await db.query(
        `${SELECT_SCHEDULES}
         WHERE id = ?;`,
        [scheduleId],
    );
    const row = response.values?.[0] as MaintenanceScheduleRow | undefined;
    return row ? mapMaintenanceScheduleRow(row) : undefined;
}

async function assertNoActiveDuplicate(
    schedule: MaintenanceSchedule,
    db: MaintenanceScheduleDatabase,
): Promise<void> {
    if (!schedule.enabled) {
        return;
    }

    const isOther = schedule.serviceType === "OTHER";
    const response = await db.query(
        `SELECT id
         FROM maintenance_schedules
         WHERE vehicleId = ?
           AND enabled = 1
           AND serviceType = ?
           AND id <> ?
           AND (? = 0 OR lower(trim(label)) = lower(trim(?)))
         LIMIT 1;`,
        [
            schedule.vehicleId,
            schedule.serviceType,
            schedule.id,
            isOther ? 1 : 0,
            schedule.label ?? "",
        ],
    );

    if ((response.values?.length ?? 0) === 0) {
        return;
    }

    if (isOther) {
        throw new Error(
            "An active Other schedule with this label already exists for the vehicle.",
        );
    }
    throw new Error(
        "An active schedule for this service already exists for the vehicle.",
    );
}

export async function createMaintenanceSchedule(
    input: MaintenanceSchedule,
    db: MaintenanceScheduleDatabase = databaseService.getDb(),
): Promise<MaintenanceSchedule> {
    const schedule = normalizeMaintenanceSchedule(input);
    assertValidMaintenanceSchedule(schedule);
    await assertNoActiveDuplicate(schedule, db);
    const timestamp = new Date().toISOString();

    await db.run(
        `INSERT INTO maintenance_schedules (
            id, vehicleId, serviceType, label, intervalMileage, intervalMonths,
            nextDueMileage, nextDueDate, reminderLeadMileage, reminderLeadDays,
            notificationId, enabled, lastCompletedServiceItemId, createdAt, updatedAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
            schedule.id,
            schedule.vehicleId,
            schedule.serviceType,
            schedule.label ?? null,
            schedule.intervalMileage ?? null,
            schedule.intervalMonths ?? null,
            schedule.nextDueMileage ?? null,
            schedule.nextDueDate ?? null,
            schedule.reminderLeadMileage ?? null,
            schedule.reminderLeadDays ?? null,
            schedule.notificationId ?? null,
            schedule.enabled ? 1 : 0,
            schedule.lastCompletedServiceItemId ?? null,
            timestamp,
            timestamp,
        ],
    );

    return schedule;
}

export async function updateMaintenanceSchedule(
    input: MaintenanceSchedule,
    db: MaintenanceScheduleDatabase = databaseService.getDb(),
): Promise<MaintenanceSchedule> {
    const schedule = normalizeMaintenanceSchedule(input);
    assertValidMaintenanceSchedule(schedule);
    await assertNoActiveDuplicate(schedule, db);

    const result = await db.run(
        `UPDATE maintenance_schedules
         SET serviceType = ?, label = ?, intervalMileage = ?, intervalMonths = ?,
             nextDueMileage = ?, nextDueDate = ?, reminderLeadMileage = ?,
             reminderLeadDays = ?, notificationId = ?, enabled = ?, updatedAt = ?
         WHERE id = ? AND vehicleId = ?;`,
        [
            schedule.serviceType,
            schedule.label ?? null,
            schedule.intervalMileage ?? null,
            schedule.intervalMonths ?? null,
            schedule.nextDueMileage ?? null,
            schedule.nextDueDate ?? null,
            schedule.reminderLeadMileage ?? null,
            schedule.reminderLeadDays ?? null,
            schedule.notificationId ?? null,
            schedule.enabled ? 1 : 0,
            new Date().toISOString(),
            schedule.id,
            schedule.vehicleId,
        ],
    );
    if ((result.changes?.changes ?? 0) === 0) {
        throw new Error("Maintenance schedule was not found for this vehicle.");
    }

    return schedule;
}

export async function deleteMaintenanceSchedule(
    scheduleId: string,
    db: MaintenanceScheduleDatabase = databaseService.getDb(),
): Promise<void> {
    const result = await db.run(
        "DELETE FROM maintenance_schedules WHERE id = ?;",
        [scheduleId],
    );
    if ((result.changes?.changes ?? 0) === 0) {
        throw new Error("Maintenance schedule was not found.");
    }
}
