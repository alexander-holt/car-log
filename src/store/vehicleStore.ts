import { defineStore } from "pinia";
import { ref } from "vue";
import type { Vehicle } from "../types";
import { databaseService } from "@/services/databaseService";

export const useVehicleStore = defineStore("vehicles", () => {
    const vehicles = ref<Vehicle[]>([]);

    async function loadVehicles(): Promise<void> {
        try {
            const db = databaseService.getDb();

            const response = await db.query("SELECT * FROM vehicles");

            vehicles.value = response.values || [];
        } catch (error) {
            console.error("Error loading vehicles from database:", error);
            throw error;
        }
    }

    async function addVehicle(vehicle: Vehicle): Promise<void> {
        try {
            const db = databaseService.getDb();
            const insertQuery = `
                INSERT INTO vehicles (id, make, model, year, vin, licensePlate, engineType, currentMileage)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            `;

            const values = [
                vehicle.id,
                vehicle.make,
                vehicle.model,
                vehicle.year,
                vehicle.vin || null,
                vehicle.licensePlate || null,
                vehicle.engineType || null,
                vehicle.currentMileage || null,
            ];

            await db.run(insertQuery, values);

            vehicles.value.push(vehicle);
        } catch (error) {
            console.error("Error storing vehicle in database:", error);
            throw error;
        }
    }

    async function updateVehicle(
        id: string,
        updatedValues: Omit<Vehicle, "id">,
    ): Promise<void> {
        try {
            const db = databaseService.getDb();
            const updateQuery = `
                UPDATE vehicles
                SET
                    make = ?,
                    model = ?,
                    year = ?,
                    vin = ?,
                    licensePlate = ?,
                    engineType = ?,
                    currentMileage = ?
                WHERE (
                    id = ?
                );
            `;

            const values = [
                updatedValues.make,
                updatedValues.model,
                updatedValues.year,
                updatedValues.vin || null,
                updatedValues.licensePlate || null,
                updatedValues.engineType || null,
                updatedValues.currentMileage || null,
                id,
            ];

            await db.run(updateQuery, values);

            const index = vehicles.value.findIndex((v) => v.id === id);
            if (index !== -1) {
                vehicles.value[index] = {
                    ...vehicles.value[index],
                    ...updatedValues,
                };
            }
        } catch (error) {
            console.error("Error updating vehicle in database:", error);
            throw error;
        }
    }

    async function deleteVehicle(id: string): Promise<void> {
        try {
            const db = databaseService.getDb();
            const deleteQuery = `
                DELETE FROM vehicles WHERE id = ?;
            `;

            await db.run(deleteQuery, [id]);

            vehicles.value = vehicles.value.filter((v) => v.id !== id);
        } catch (error) {
            console.error("Error deleting vehicle from database:", error);
            throw error;
        }
    }

    return {
        vehicles,
        loadVehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
    };
});
