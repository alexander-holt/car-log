import { databaseService } from "@/services/databaseService";
import {
    normalizeOptionalText,
    normalizeVin,
    validateVehicle,
} from "@/services/serviceRecordValidation";
import type { Vehicle } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";

interface VehicleRow extends Omit<Vehicle, "mileageRemindersEnabled"> {
    mileageRemindersEnabled?: number | boolean;
}

function mapVehicleRow(row: VehicleRow): Vehicle {
    return {
        id: row.id,
        make: row.make,
        model: row.model,
        year: row.year,
        vin: row.vin ?? undefined,
        licensePlate: row.licensePlate ?? undefined,
        engineType: row.engineType ?? undefined,
        currentMileage: row.currentMileage ?? undefined,
        mileageUpdatedAt: row.mileageUpdatedAt ?? undefined,
        mileageReminderIntervalDays:
            row.mileageReminderIntervalDays ?? undefined,
        mileageRemindersEnabled:
            row.mileageRemindersEnabled === undefined
                ? undefined
                : row.mileageRemindersEnabled === true ||
                  row.mileageRemindersEnabled === 1,
    };
}

function normalizeVehicle(vehicle: Omit<Vehicle, "id">): Omit<Vehicle, "id"> {
    return {
        ...vehicle,
        make: vehicle.make.trim(),
        model: vehicle.model.trim(),
        year: Number(vehicle.year),
        vin: normalizeVin(vehicle.vin ?? ""),
        licensePlate: normalizeOptionalText(vehicle.licensePlate ?? ""),
        engineType: normalizeOptionalText(vehicle.engineType ?? ""),
    };
}

function assertValidVehicle(vehicle: Omit<Vehicle, "id">): void {
    const issue = validateVehicle(vehicle)[0];
    if (issue) {
        throw new Error(issue.message);
    }
}

export const useVehicleStore = defineStore("vehicles", () => {
    const vehicles = ref<Vehicle[]>([]);

    async function loadVehicles(): Promise<void> {
        const db = databaseService.getDb();
        const response = await db.query("SELECT * FROM vehicles");
        vehicles.value = (response.values ?? []).map((row) =>
            mapVehicleRow(row as VehicleRow),
        );
    }

    async function addVehicle(vehicle: Vehicle): Promise<void> {
        const db = databaseService.getDb();
        const { id, ...vehicleValues } = vehicle;
        const normalized = normalizeVehicle(vehicleValues);
        assertValidVehicle(normalized);
        const mileageUpdatedAt =
            normalized.currentMileage === undefined
                ? undefined
                : new Date().toISOString();

        await db.run(
            `INSERT INTO vehicles (
                id, make, model, year, vin, licensePlate, engineType,
                currentMileage, mileageUpdatedAt
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                id,
                normalized.make,
                normalized.model,
                normalized.year,
                normalized.vin ?? null,
                normalized.licensePlate ?? null,
                normalized.engineType ?? null,
                normalized.currentMileage ?? null,
                mileageUpdatedAt ?? null,
            ],
        );

        vehicles.value.push({
            id,
            ...normalized,
            mileageUpdatedAt,
        });
    }

    async function updateVehicle(
        id: string,
        updatedValues: Omit<Vehicle, "id">,
    ): Promise<void> {
        const db = databaseService.getDb();
        const normalized = normalizeVehicle(updatedValues);
        assertValidVehicle(normalized);
        const existing = vehicles.value.find((vehicle) => vehicle.id === id);
        const mileageChanged =
            existing?.currentMileage !== normalized.currentMileage;
        const mileageUpdatedAt = mileageChanged
            ? normalized.currentMileage === undefined
                ? undefined
                : new Date().toISOString()
            : existing?.mileageUpdatedAt;
        const updatedAt = new Date().toISOString();

        await db.run(
            `UPDATE vehicles
             SET make = ?, model = ?, year = ?, vin = ?, licensePlate = ?,
                 engineType = ?, currentMileage = ?, mileageUpdatedAt = ?, updatedAt = ?
             WHERE id = ?;`,
            [
                normalized.make,
                normalized.model,
                normalized.year,
                normalized.vin ?? null,
                normalized.licensePlate ?? null,
                normalized.engineType ?? null,
                normalized.currentMileage ?? null,
                mileageUpdatedAt ?? null,
                updatedAt,
                id,
            ],
        );

        const index = vehicles.value.findIndex((vehicle) => vehicle.id === id);
        if (index !== -1) {
            vehicles.value[index] = {
                id,
                ...normalized,
                mileageUpdatedAt,
            };
        }
    }

    async function deleteVehicle(id: string): Promise<void> {
        const db = databaseService.getDb();
        await db.run("DELETE FROM vehicles WHERE id = ?;", [id]);
        vehicles.value = vehicles.value.filter((vehicle) => vehicle.id !== id);
    }

    return {
        vehicles,
        loadVehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
    };
});
