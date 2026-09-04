import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useVehicleStore } from "@/store/vehicleStore";
import { databaseService } from "@/services/databaseService";
import type { Vehicle } from "@/types";

vi.mock("@/services/databaseService", () => ({
    databaseService: {
        getDb: vi.fn(),
    },
}));

describe("useVehicleStore", () => {
    let mockDb: any;

    beforeEach(() => {
        // Reset Pinia state before every test
        setActivePinia(createPinia());

        // Create fresh mock functions for our database operations
        mockDb = {
            query: vi.fn(),
            run: vi.fn(),
        };

        // Tell the mocked getDb() to return our mockDb object
        (databaseService.getDb as any).mockReturnValue(mockDb);
    });

    it("loads vehicles from the database and updates state", async () => {
        const store = useVehicleStore();

        const mockVehicles: Vehicle[] = [
            {
                id: "v1",
                make: "Toyota",
                model: "Camry",
                year: 2020,
                currentMileage: 40000,
            },
            { id: "v2", make: "Honda", model: "Civic", year: 2022 },
        ];

        // Simulate SQLite returning rows
        mockDb.query.mockResolvedValue({ values: mockVehicles });

        await store.loadVehicles();

        // Verify database was called correctly
        expect(mockDb.query).toHaveBeenCalledTimes(1);
        expect(mockDb.query).toHaveBeenCalledWith("SELECT * FROM vehicles");

        // Verify Pinia state updated
        expect(store.vehicles.length).toBe(2);
        expect(store.vehicles[0].make).toBe("Toyota");
    });

    it("throws a vehicle load failure so startup can show it", async () => {
        const store = useVehicleStore();
        mockDb.query.mockRejectedValue(new Error("Database schema is invalid"));

        await expect(store.loadVehicles()).rejects.toThrow(
            "Database schema is invalid",
        );
        expect(store.vehicles).toEqual([]);
    });

    it("adds a new vehicle and pushes it to local state", async () => {
        const store = useVehicleStore();

        const newVehicle: Vehicle = {
            id: "v3",
            make: "Ford",
            model: "F-150",
            year: 2021,
            vin: "1FTFW1E50MFA00001",
            licensePlate: "ABC-1234",
            engineType: "V6",
            currentMileage: 50000,
        };

        mockDb.run.mockResolvedValue(); // Simulate successful insert

        await store.addVehicle(newVehicle);

        // Verify the insert query was executed with the correct array of values
        expect(mockDb.run).toHaveBeenCalledTimes(1);
        expect(mockDb.run.mock.calls[0][0]).toContain("INSERT INTO vehicles");
        expect(mockDb.run.mock.calls[0][1]).toEqual([
            "v3",
            "Ford",
            "F-150",
            2021,
            "1FTFW1E50MFA00001",
            "ABC-1234",
            "V6",
            50000,
            expect.any(String),
        ]);

        // Verify local state includes the new vehicle
        expect(store.vehicles.length).toBe(1);
        expect(store.vehicles[0].id).toBe("v3");
    });

    it("updates an existing vehicle in state and database", async () => {
        const store = useVehicleStore();

        // Seed initial state
        store.vehicles = [
            {
                id: "v1",
                make: "Toyota",
                model: "Camry",
                year: 2020,
                currentMileage: 40000,
            },
        ];

        const updatedValues = {
            make: "Toyota",
            model: "Camry SE", // Updated model
            year: 2020,
            currentMileage: 45000, // Updated mileage
        };

        mockDb.run.mockResolvedValue(); // Simulate successful update

        await store.updateVehicle("v1", updatedValues);

        // Verify the update query was executed with the updated values and the ID at the end
        expect(mockDb.run).toHaveBeenCalledTimes(1);
        expect(mockDb.run.mock.calls[0][0]).toContain("UPDATE vehicles");
        expect(mockDb.run.mock.calls[0][1]).toEqual([
            "Toyota",
            "Camry SE",
            2020,
            null,
            null,
            null,
            45000,
            expect.any(String),
            30,
            1,
            expect.any(String),
            "v1",
        ]);

        // Verify local state reflects the changes
        expect(store.vehicles[0].model).toBe("Camry SE");
        expect(store.vehicles[0].currentMileage).toBe(45000);
        expect(store.vehicles[0].mileageUpdatedAt).toEqual(expect.any(String));
    });

    it("updates mileage, reminder settings, and local state immediately", async () => {
        const store = useVehicleStore();
        store.vehicles = [
            {
                id: "v1",
                make: "Toyota",
                model: "Camry",
                year: 2020,
                currentMileage: 40_000,
                mileageReminderIntervalDays: 30,
                mileageRemindersEnabled: true,
            },
        ];
        mockDb.run.mockResolvedValue({ changes: { changes: 1 } });

        await store.updateMileage("v1", {
            mileage: 41_250,
            mileageReminderIntervalDays: 45,
            mileageRemindersEnabled: false,
        });

        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining("SET currentMileage"),
            [41_250, expect.any(String), 45, 0, expect.any(String), "v1"],
        );
        expect(store.vehicles[0]).toEqual(
            expect.objectContaining({
                currentMileage: 41_250,
                mileageUpdatedAt: expect.any(String),
                mileageReminderIntervalDays: 45,
                mileageRemindersEnabled: false,
            }),
        );
    });

    it("requires confirmation before lowering saved mileage", async () => {
        const store = useVehicleStore();
        store.vehicles = [
            {
                id: "v1",
                make: "Toyota",
                model: "Camry",
                year: 2020,
                currentMileage: 40_000,
            },
        ];
        mockDb.run.mockResolvedValue({ changes: { changes: 1 } });

        await expect(
            store.updateMileage("v1", {
                mileage: 39_000,
                mileageReminderIntervalDays: 30,
                mileageRemindersEnabled: true,
            }),
        ).rejects.toThrow("Confirm an odometer correction");
        expect(mockDb.run).not.toHaveBeenCalled();

        await store.updateMileage("v1", {
            mileage: 39_000,
            allowCorrection: true,
            mileageReminderIntervalDays: 30,
            mileageRemindersEnabled: true,
        });
        expect(store.vehicles[0].currentMileage).toBe(39_000);
    });

    it("rejects invalid VIN and mileage values before writing", async () => {
        const store = useVehicleStore();

        await expect(
            store.addVehicle({
                id: "invalid",
                make: "Honda",
                model: "Civic",
                year: 2020,
                vin: "INVALIDVIN",
                currentMileage: 1.5,
            }),
        ).rejects.toThrow("Mileage must be a whole number zero or greater.");
        expect(mockDb.run).not.toHaveBeenCalled();
    });

    it("deletes a vehicle from the database and local state", async () => {
        const store = useVehicleStore();

        // Seed initial state
        store.vehicles = [
            { id: "v1", make: "Toyota", model: "Camry", year: 2020 },
            { id: "v2", make: "Honda", model: "Civic", year: 2022 },
        ];

        mockDb.run.mockResolvedValue(); // Simulate successful delete

        await store.deleteVehicle("v1");

        // Verify the delete query
        expect(mockDb.run).toHaveBeenCalledTimes(1);
        expect(mockDb.run.mock.calls[0][0]).toContain(
            "DELETE FROM vehicles WHERE id = ?",
        );
        expect(mockDb.run.mock.calls[0][1]).toEqual(["v1"]);

        // Verify the item was removed from local state
        expect(store.vehicles.length).toBe(1);
        expect(store.vehicles[0].id).toBe("v2");
    });

    it("throws an error and does not update state if adding a vehicle fails", async () => {
        const store = useVehicleStore();
        store.vehicles = []; // Start empty

        const newVehicle: Vehicle = {
            id: "v_error",
            make: "Chevy",
            model: "Silverado",
            year: 2019,
        };

        // Force the mock database to throw an error
        mockDb.run.mockRejectedValue(new Error("Constraint failed"));

        // Verify the store throws the error
        await expect(store.addVehicle(newVehicle)).rejects.toThrow(
            "Constraint failed",
        );

        // Verify the local state remained empty
        expect(store.vehicles.length).toBe(0);
    });

    it("throws an error and keeps the vehicle in state if deletion fails", async () => {
        const store = useVehicleStore();

        // Seed state with one vehicle
        store.vehicles = [
            { id: "v1", make: "Toyota", model: "Camry", year: 2020 },
        ];

        mockDb.run.mockRejectedValue(new Error("Database locked"));

        await expect(store.deleteVehicle("v1")).rejects.toThrow(
            "Database locked",
        );

        // Verify the vehicle was NOT removed from the local array
        expect(store.vehicles.length).toBe(1);
        expect(store.vehicles[0].id).toBe("v1");
    });

    it("executes database update but does not crash if vehicle is missing from local state", async () => {
        const store = useVehicleStore();

        // Seed state with a DIFFERENT vehicle
        store.vehicles = [
            { id: "v1", make: "Toyota", model: "Camry", year: 2020 },
        ];

        mockDb.run.mockResolvedValue();

        // Try to update a vehicle ID (v99) that doesn't exist in local state
        await store.updateVehicle("v99", {
            make: "Honda",
            model: "Civic",
            year: 2022,
        });

        // Verify the database update was still attempted
        expect(mockDb.run).toHaveBeenCalledTimes(1);

        // Verify the local state wasn't mutated or corrupted
        expect(store.vehicles.length).toBe(1);
        expect(store.vehicles[0].id).toBe("v1"); // Original vehicle untouched
    });
});
