import { databaseService } from "@/services/databaseService";
import { MaintenanceRecord } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";

function mapSqlRowToRecord(row: any): MaintenanceRecord {
    const baseFields = {
        id: row.id,
        vehicleId: row.vehicleId,
        date: row.date,
        mileage: row.mileage,
        cost: row.cost ?? undefined,
        shopName: row.shopName ?? undefined,
        notes: row.notes ?? undefined,
    };

    switch (row.type) {
        case "REPAIR":
            return {
                ...baseFields,
                type: "REPAIR",
                partReplaced: row.partReplaced,
            };
        case "OIL_CHANGE":
            return {
                ...baseFields,
                type: "OIL_CHANGE",
                nextServiceMileage: row.nextServiceMileage ?? undefined,
                nextServiceDate: row.nextServiceDate ?? undefined,
                filterReplaced: row.filterReplaced === 1,
                oilType: row.oilType ?? undefined,
            };
        case "TIRE_ROTATION":
            return {
                ...baseFields,
                type: "TIRE_ROTATION",
                nextServiceMileage: row.nextServiceMileage ?? undefined,
                nextServiceDate: row.nextServiceDate ?? undefined,
                treadDepthRemaining: row.treadDepthRemaining ?? undefined,
            };
        default:
            throw new Error(`Unknown maintenance record type: ${row.type}`);
    }
}

export const useRecordStore = defineStore("records", () => {
    const records = ref<MaintenanceRecord[]>([]);

    async function loadRecords(vehicleId: string): Promise<void> {
        try {
            const db = databaseService.getDb();
            const query = `
                SELECT 
                    base.id, base.vehicleId, base.type, base.date, base.mileage, 
                    base.cost, base.shopName, base.notes,
                    prev.nextServiceMileage, prev.nextServiceDate,
                    rep.partReplaced,
                    oil.filterReplaced, oil.oilType,
                    tire.treadDepthRemaining
                FROM maintenance_records base
                LEFT JOIN preventative_records prev ON base.id = prev.id
                LEFT JOIN repair_records rep ON base.id = rep.id
                LEFT JOIN oil_change_records oil ON base.id = oil.id
                LEFT JOIN tire_rotation_records tire ON base.id = tire.id
                WHERE base.vehicleId = ?
                ORDER BY base.date DESC;
            `;

            const response = await db.query(query, [vehicleId]);
            const rows = response.values || [];

            records.value = rows.map(mapSqlRowToRecord);
        } catch (error) {
            console.error(
                "Error loading maintenance records from database:",
                error,
            );
        }
    }

    async function addRecord(record: MaintenanceRecord): Promise<void> {
        const db = databaseService.getDb();

        try {
            await db.run("BEGIN TRANSACTION;", [], false);

            await db.run(
                `INSERT INTO maintenance_records (id, vehicleId, type, date, mileage, cost, shopName, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    record.id,
                    record.vehicleId,
                    record.type,
                    record.date,
                    record.mileage,
                    record.cost ?? null,
                    record.shopName ?? null,
                    record.notes ?? null,
                ],
                false,
            );

            if (
                record.type === "OIL_CHANGE" ||
                record.type === "TIRE_ROTATION"
            ) {
                await db.run(
                    `INSERT INTO preventative_records (id, nextServiceMileage, nextServiceDate) 
                     VALUES (?, ?, ?);`,
                    [
                        record.id,
                        record.nextServiceMileage ?? null,
                        record.nextServiceDate ?? null,
                    ],
                    false,
                );
            }

            if (record.type === "REPAIR") {
                await db.run(
                    `INSERT INTO repair_records (id, partReplaced) VALUES (?, ?);`,
                    [record.id, record.partReplaced],
                    false,
                );
            } else if (record.type === "OIL_CHANGE") {
                await db.run(
                    `INSERT INTO oil_change_records (id, filterReplaced, oilType) VALUES (?, ?, ?);`,
                    [
                        record.id,
                        record.filterReplaced ? 1 : 0,
                        record.oilType ?? null,
                    ],
                    false,
                );
            } else if (record.type === "TIRE_ROTATION") {
                await db.run(
                    `INSERT INTO tire_rotation_records (id, treadDepthRemaining) VALUES (?, ?);`,
                    [record.id, record.treadDepthRemaining ?? null],
                    false,
                );
            }

            await db.run("COMMIT;", [], false);
            records.value.push(record);

            // Re-sort for ordered UI
            records.value.sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
        } catch (error) {
            await db.run("ROLLBACK;", [], false);
            console.error(
                "Error storing maintenance record in database:",
                error,
            );
            throw error;
        }
    }

    async function updateRecord(record: MaintenanceRecord): Promise<void> {
        const db = databaseService.getDb();

        try {
            await db.run("BEGIN TRANSACTION;", [], false);

            await db.run(
                `UPDATE maintenance_records 
                 SET
                    date = ?,
                    mileage = ?,
                    cost = ?,
                    shopName = ?,
                    notes = ? 
                 WHERE id = ?;`,
                [
                    record.date,
                    record.mileage,
                    record.cost ?? null,
                    record.shopName ?? null,
                    record.notes ?? null,
                    record.id,
                ],
                false,
            );

            if (
                record.type === "OIL_CHANGE" ||
                record.type === "TIRE_ROTATION"
            ) {
                await db.run(
                    `UPDATE preventative_records 
                     SET
                        nextServiceMileage = ?,
                        nextServiceDate = ? 
                     WHERE id = ?;`,
                    [
                        record.nextServiceMileage ?? null,
                        record.nextServiceDate ?? null,
                        record.id,
                    ],
                    false,
                );
            }

            if (record.type === "REPAIR") {
                await db.run(
                    `UPDATE repair_records SET partReplaced = ? WHERE id = ?;`,
                    [record.partReplaced, record.id],
                    false,
                );
            } else if (record.type === "OIL_CHANGE") {
                await db.run(
                    `UPDATE oil_change_records
                     SET
                        filterReplaced = ?,
                        oilType = ?
                     WHERE id = ?;`,
                    [
                        record.filterReplaced ? 1 : 0,
                        record.oilType ?? null,
                        record.id,
                    ],
                    false,
                );
            } else if (record.type === "TIRE_ROTATION") {
                await db.run(
                    `UPDATE tire_rotation_records
                     SET treadDepthRemaining = ?
                     WHERE id = ?;`,
                    [record.treadDepthRemaining ?? null, record.id],
                    false,
                );
            }

            await db.run("COMMIT;", [], false);

            const index = records.value.findIndex((r) => r.id === record.id);
            if (index !== -1) {
                records.value[index] = { ...record };
            }
        } catch (error) {
            await db.run("ROLLBACK;", [], false);
            console.error(
                "Error updating maintenance record in database:",
                error,
            );
            throw error;
        }
    }

    async function deleteRecord(id: string): Promise<void> {
        try {
            const db = databaseService.getDb();

            // FOREIGN KEY ... ON DELETE CASCADE automatically deletes from the linked tables
            const deleteQuery = `DELETE FROM maintenance_records WHERE id = ?;`;

            await db.run(deleteQuery, [id]);

            records.value = records.value.filter((r) => r.id !== id);
        } catch (error) {
            console.error(
                "Error deleting maintenance record from database:",
                error,
            );
            throw error;
        }
    }

    return {
        records,
        loadRecords,
        addRecord,
        updateRecord,
        deleteRecord,
    };
});
