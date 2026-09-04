import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { databaseService } from "@/services/databaseService";
import {
    assertValidServiceRecord,
    normalizeOptionalText,
} from "@/services/serviceRecordValidation";
import { loadMaintenanceSchedule } from "@/services/maintenanceScheduleRepository";
import { advanceMaintenanceSchedule } from "@/services/maintenanceScheduleService";
import type {
    MaintenanceSchedule,
    ProviderType,
    ServiceItem,
    ServiceRecord,
    ServiceType,
} from "@/types";

export type ServiceRecordDatabase = Pick<
    SQLiteDBConnection,
    | "query"
    | "run"
    | "beginTransaction"
    | "commitTransaction"
    | "rollbackTransaction"
>;

export interface SaveServiceRecordResult {
    mileageUpdatedAt?: string;
    advancedSchedules?: MaintenanceSchedule[];
}

interface ServiceRecordRow {
    recordId: string;
    vehicleId: string;
    date: string;
    mileage: number;
    providerType: ProviderType;
    providerName: string | null;
    totalCostCents: number | null;
    recordNotes: string | null;
    itemId: string | null;
    serviceType: ServiceType | null;
    itemTitle: string | null;
    itemNotes: string | null;
    scheduleId: string | null;
    oilType: string | null;
    filterReplaced: number | null;
    treadDepthRemaining: number | null;
}

const SELECT_SERVICE_RECORDS = `
    SELECT
        record.id AS recordId,
        record.vehicleId,
        record.date,
        record.mileage,
        record.providerType,
        record.providerName,
        record.totalCostCents,
        record.notes AS recordNotes,
        item.id AS itemId,
        item.serviceType,
        item.title AS itemTitle,
        item.notes AS itemNotes,
        item.scheduleId,
        oil.oilType,
        oil.filterReplaced,
        tire.treadDepthRemaining
    FROM service_records record
    LEFT JOIN service_items item ON item.serviceRecordId = record.id
    LEFT JOIN oil_change_details oil ON oil.serviceItemId = item.id
    LEFT JOIN tire_service_details tire ON tire.serviceItemId = item.id
`;

function textOrUndefined(value: string | null): string | undefined {
    return value ?? undefined;
}

function mapRowToItem(row: ServiceRecordRow): ServiceItem | undefined {
    if (!row.itemId || !row.serviceType) {
        return undefined;
    }

    const shared = {
        id: row.itemId,
        serviceRecordId: row.recordId,
        title: textOrUndefined(row.itemTitle),
        notes: textOrUndefined(row.itemNotes),
        scheduleId: textOrUndefined(row.scheduleId),
    };

    switch (row.serviceType) {
        case "OIL_CHANGE":
            return {
                ...shared,
                serviceType: "OIL_CHANGE",
                oilType: textOrUndefined(row.oilType),
                filterReplaced: row.filterReplaced === 1,
            };
        case "TIRE_ROTATION":
        case "TIRE_REPLACEMENT":
            return {
                ...shared,
                serviceType: row.serviceType,
                treadDepthRemaining: row.treadDepthRemaining ?? undefined,
            };
        case "OTHER":
            if (!row.itemTitle) {
                throw new Error(
                    `Other service item ${row.itemId} has no title.`,
                );
            }
            return {
                ...shared,
                serviceType: "OTHER",
                title: row.itemTitle,
            };
        case "BRAKE_SERVICE":
        case "BATTERY_SERVICE":
        case "INSPECTION":
        case "REPAIR":
            return {
                ...shared,
                serviceType: row.serviceType,
            };
        default:
            throw new Error(
                `Unknown service item type: ${String(row.serviceType)}`,
            );
    }
}

export function mapServiceRecordRows(
    rows: ServiceRecordRow[],
): ServiceRecord[] {
    const records = new Map<string, ServiceRecord>();

    for (const row of rows) {
        let record = records.get(row.recordId);
        if (!record) {
            record = {
                id: row.recordId,
                vehicleId: row.vehicleId,
                date: row.date,
                mileage: row.mileage,
                providerType: row.providerType,
                providerName: textOrUndefined(row.providerName),
                totalCostCents: row.totalCostCents ?? undefined,
                notes: textOrUndefined(row.recordNotes),
                items: [],
            };
            records.set(row.recordId, record);
        }

        const item = mapRowToItem(row);
        if (item) {
            record.items.push(item);
        }
    }

    return [...records.values()];
}

export async function loadServiceRecords(
    vehicleId: string,
    db: ServiceRecordDatabase = databaseService.getDb(),
): Promise<ServiceRecord[]> {
    const response = await db.query(
        `${SELECT_SERVICE_RECORDS}
         WHERE record.vehicleId = ?
         ORDER BY record.date DESC, record.createdAt DESC, item.createdAt, item.id;`,
        [vehicleId],
    );

    return mapServiceRecordRows((response.values ?? []) as ServiceRecordRow[]);
}

export async function loadServiceRecord(
    recordId: string,
    db: ServiceRecordDatabase = databaseService.getDb(),
): Promise<ServiceRecord | undefined> {
    const response = await db.query(
        `${SELECT_SERVICE_RECORDS}
         WHERE record.id = ?
         ORDER BY item.createdAt, item.id;`,
        [recordId],
    );

    return mapServiceRecordRows(
        (response.values ?? []) as ServiceRecordRow[],
    )[0];
}

async function runInTransaction<T>(
    db: ServiceRecordDatabase,
    operation: () => Promise<T>,
): Promise<T> {
    await db.beginTransaction();
    try {
        const result = await operation();
        await db.commitTransaction();
        return result;
    } catch (error) {
        try {
            await db.rollbackTransaction();
        } catch {
            // Preserve the write error if rollback also fails.
        }
        throw error;
    }
}

async function insertItem(
    recordId: string,
    item: ServiceItem,
    timestamp: string,
    db: ServiceRecordDatabase,
): Promise<void> {
    await db.run(
        `INSERT INTO service_items (
            id, serviceRecordId, serviceType, title, notes, scheduleId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
            item.id,
            recordId,
            item.serviceType,
            normalizeOptionalText(item.title ?? "") ?? null,
            normalizeOptionalText(item.notes ?? "") ?? null,
            item.scheduleId ?? null,
            timestamp,
            timestamp,
        ],
        false,
    );

    await writeItemDetails(item, db);
}

async function writeItemDetails(
    item: ServiceItem,
    db: ServiceRecordDatabase,
): Promise<void> {
    if (item.serviceType === "OIL_CHANGE") {
        await db.run(
            `INSERT INTO oil_change_details (serviceItemId, oilType, filterReplaced)
             VALUES (?, ?, ?)
             ON CONFLICT(serviceItemId) DO UPDATE SET
                oilType = excluded.oilType,
                filterReplaced = excluded.filterReplaced;`,
            [
                item.id,
                normalizeOptionalText(item.oilType ?? "") ?? null,
                item.filterReplaced ? 1 : 0,
            ],
            false,
        );
        await db.run(
            "DELETE FROM tire_service_details WHERE serviceItemId = ?;",
            [item.id],
            false,
        );
        return;
    }

    if (
        item.serviceType === "TIRE_ROTATION" ||
        item.serviceType === "TIRE_REPLACEMENT"
    ) {
        await db.run(
            `INSERT INTO tire_service_details (serviceItemId, treadDepthRemaining)
             VALUES (?, ?)
             ON CONFLICT(serviceItemId) DO UPDATE SET
                treadDepthRemaining = excluded.treadDepthRemaining;`,
            [item.id, item.treadDepthRemaining ?? null],
            false,
        );
        await db.run(
            "DELETE FROM oil_change_details WHERE serviceItemId = ?;",
            [item.id],
            false,
        );
        return;
    }

    await db.run(
        "DELETE FROM oil_change_details WHERE serviceItemId = ?;",
        [item.id],
        false,
    );
    await db.run(
        "DELETE FROM tire_service_details WHERE serviceItemId = ?;",
        [item.id],
        false,
    );
}

async function updateVehicleMileage(
    record: ServiceRecord,
    timestamp: string,
    db: ServiceRecordDatabase,
): Promise<string | undefined> {
    const result = await db.run(
        `UPDATE vehicles
         SET currentMileage = ?, mileageUpdatedAt = ?, updatedAt = ?
         WHERE id = ? AND (currentMileage IS NULL OR currentMileage < ?);`,
        [
            record.mileage,
            timestamp,
            timestamp,
            record.vehicleId,
            record.mileage,
        ],
        false,
    );

    return (result.changes?.changes ?? 0) > 0 ? timestamp : undefined;
}

async function advanceLinkedSchedules(
    record: ServiceRecord,
    timestamp: string,
    db: ServiceRecordDatabase,
): Promise<MaintenanceSchedule[]> {
    const advancedSchedules: MaintenanceSchedule[] = [];
    const completedScheduleIds = new Set<string>();

    for (const item of record.items) {
        if (!item.scheduleId) {
            continue;
        }
        if (completedScheduleIds.has(item.scheduleId)) {
            throw new Error(
                "A maintenance schedule can only be completed once per service record.",
            );
        }
        completedScheduleIds.add(item.scheduleId);

        const schedule = await loadMaintenanceSchedule(item.scheduleId, db);
        if (!schedule || schedule.vehicleId !== record.vehicleId) {
            throw new Error(
                "A linked maintenance schedule was not found for this vehicle.",
            );
        }
        if (!schedule.enabled) {
            throw new Error(
                "A disabled maintenance schedule cannot be completed.",
            );
        }
        if (schedule.serviceType !== item.serviceType) {
            throw new Error(
                "The service item category does not match its maintenance schedule.",
            );
        }

        const advanced = advanceMaintenanceSchedule(
            schedule,
            item.id,
            record.date,
            record.mileage,
        );
        const result = await db.run(
            `UPDATE maintenance_schedules
             SET nextDueMileage = ?, nextDueDate = ?,
                 lastCompletedServiceItemId = ?, updatedAt = ?
             WHERE id = ? AND vehicleId = ? AND enabled = 1;`,
            [
                advanced.nextDueMileage ?? null,
                advanced.nextDueDate ?? null,
                item.id,
                timestamp,
                schedule.id,
                record.vehicleId,
            ],
            false,
        );
        if ((result.changes?.changes ?? 0) === 0) {
            throw new Error(
                "A linked maintenance schedule could not be updated.",
            );
        }
        advancedSchedules.push(advanced);
    }

    return advancedSchedules;
}

export async function createServiceRecord(
    record: ServiceRecord,
    db: ServiceRecordDatabase = databaseService.getDb(),
): Promise<SaveServiceRecordResult> {
    assertValidServiceRecord(record);
    const timestamp = new Date().toISOString();

    return runInTransaction(db, async () => {
        await db.run(
            `INSERT INTO service_records (
                id, vehicleId, date, mileage, providerType, providerName,
                totalCostCents, notes, createdAt, updatedAt
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                record.id,
                record.vehicleId,
                record.date,
                record.mileage,
                record.providerType,
                normalizeOptionalText(record.providerName ?? "") ?? null,
                record.totalCostCents ?? null,
                normalizeOptionalText(record.notes ?? "") ?? null,
                timestamp,
                timestamp,
            ],
            false,
        );

        for (const item of record.items) {
            await insertItem(record.id, item, timestamp, db);
        }

        const advancedSchedules = await advanceLinkedSchedules(
            record,
            timestamp,
            db,
        );

        return {
            mileageUpdatedAt: await updateVehicleMileage(record, timestamp, db),
            advancedSchedules,
        };
    });
}

export async function updateServiceRecord(
    record: ServiceRecord,
    db: ServiceRecordDatabase = databaseService.getDb(),
): Promise<SaveServiceRecordResult> {
    assertValidServiceRecord(record);
    const timestamp = new Date().toISOString();

    return runInTransaction(db, async () => {
        const recordUpdate = await db.run(
            `UPDATE service_records
             SET date = ?, mileage = ?, providerType = ?, providerName = ?,
                 totalCostCents = ?, notes = ?, updatedAt = ?
             WHERE id = ? AND vehicleId = ?;`,
            [
                record.date,
                record.mileage,
                record.providerType,
                normalizeOptionalText(record.providerName ?? "") ?? null,
                record.totalCostCents ?? null,
                normalizeOptionalText(record.notes ?? "") ?? null,
                timestamp,
                record.id,
                record.vehicleId,
            ],
            false,
        );
        if ((recordUpdate.changes?.changes ?? 0) === 0) {
            throw new Error("Service record was not found for this vehicle.");
        }

        const existingResponse = await db.query(
            "SELECT id FROM service_items WHERE serviceRecordId = ?;",
            [record.id],
        );
        const existingIds = new Set(
            (existingResponse.values ?? []).map((row) =>
                String((row as { id: unknown }).id),
            ),
        );
        const incomingIds = new Set(record.items.map((item) => item.id));

        for (const existingId of existingIds) {
            if (!incomingIds.has(existingId)) {
                await db.run(
                    "DELETE FROM service_items WHERE id = ? AND serviceRecordId = ?;",
                    [existingId, record.id],
                    false,
                );
            }
        }

        for (const item of record.items) {
            if (!existingIds.has(item.id)) {
                await insertItem(record.id, item, timestamp, db);
                continue;
            }

            await db.run(
                `UPDATE service_items
                 SET serviceType = ?, title = ?, notes = ?, scheduleId = ?, updatedAt = ?
                 WHERE id = ? AND serviceRecordId = ?;`,
                [
                    item.serviceType,
                    normalizeOptionalText(item.title ?? "") ?? null,
                    normalizeOptionalText(item.notes ?? "") ?? null,
                    item.scheduleId ?? null,
                    timestamp,
                    item.id,
                    record.id,
                ],
                false,
            );
            await writeItemDetails(item, db);
        }

        const advancedSchedules = await advanceLinkedSchedules(
            record,
            timestamp,
            db,
        );

        return {
            mileageUpdatedAt: await updateVehicleMileage(record, timestamp, db),
            advancedSchedules,
        };
    });
}

export async function deleteServiceRecord(
    recordId: string,
    db: ServiceRecordDatabase = databaseService.getDb(),
): Promise<void> {
    await runInTransaction(db, async () => {
        await db.run(
            "DELETE FROM service_records WHERE id = ?;",
            [recordId],
            false,
        );
    });
}
