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
        }
    }

    async function addVehicle(vehicle: Vehicle): Promise<void> {
        try {
            const db = databaseService.getDb();
            const insertQuery = `
                INSERT INTO vehicles (id, make, model, year, licensePlate, currentMileage)
                VALUES (?, ?, ?, ?, ?, ?);
            `;

            const values = [
                vehicle.id,
                vehicle.make,
                vehicle.model,
                vehicle.year,
                vehicle.licensePlate,
                vehicle.currentMileage,
            ];

            await db.run(insertQuery, values);

            vehicles.value.push(vehicle);
        } catch (error) {
            console.error("Error storing vehicle in database:", error);
            throw error;
        }
    }

    return {
        vehicles,
        loadVehicles,
        addVehicle,
    };
});
