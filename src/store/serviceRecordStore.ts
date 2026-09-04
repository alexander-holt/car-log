import {
    createServiceRecord,
    deleteServiceRecord,
    loadServiceRecords,
    updateServiceRecord,
    type SaveServiceRecordResult,
} from "@/services/serviceRecordRepository";
import { useVehicleStore } from "@/store/vehicleStore";
import { useMaintenanceScheduleStore } from "@/store/maintenanceScheduleStore";
import type { ServiceRecord } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "An unexpected service history error occurred.";
}

function sortRecords(records: ServiceRecord[]): void {
    records.sort((first, second) => {
        const dateOrder = second.date.localeCompare(first.date);
        return dateOrder === 0 ? second.id.localeCompare(first.id) : dateOrder;
    });
}

export const useServiceRecordStore = defineStore("serviceRecords", () => {
    const records = ref<ServiceRecord[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function loadRecords(vehicleId: string): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            records.value = await loadServiceRecords(vehicleId);
        } catch (caught) {
            error.value = errorMessage(caught);
            records.value = [];
            throw caught;
        } finally {
            loading.value = false;
        }
    }

    function syncVehicleMileage(
        record: ServiceRecord,
        result: SaveServiceRecordResult,
    ): void {
        if (!result.mileageUpdatedAt) {
            return;
        }

        const vehicleStore = useVehicleStore();
        const vehicle = vehicleStore.vehicles.find(
            (candidate) => candidate.id === record.vehicleId,
        );
        if (vehicle) {
            vehicle.currentMileage = record.mileage;
            vehicle.mileageUpdatedAt = result.mileageUpdatedAt;
        }
    }

    function syncAdvancedSchedules(result: SaveServiceRecordResult): void {
        useMaintenanceScheduleStore().applyAdvancedSchedules(
            result.advancedSchedules ?? [],
        );
    }

    async function addRecord(record: ServiceRecord): Promise<void> {
        error.value = null;
        try {
            const result = await createServiceRecord(record);
            records.value.push(record);
            sortRecords(records.value);
            syncVehicleMileage(record, result);
            syncAdvancedSchedules(result);
        } catch (caught) {
            error.value = errorMessage(caught);
            throw caught;
        }
    }

    async function updateRecord(record: ServiceRecord): Promise<void> {
        error.value = null;
        try {
            const result = await updateServiceRecord(record);
            const index = records.value.findIndex(
                (candidate) => candidate.id === record.id,
            );
            if (index === -1) {
                records.value.push(record);
            } else {
                records.value[index] = record;
            }
            sortRecords(records.value);
            syncVehicleMileage(record, result);
            syncAdvancedSchedules(result);
        } catch (caught) {
            error.value = errorMessage(caught);
            throw caught;
        }
    }

    async function deleteRecord(recordId: string): Promise<void> {
        error.value = null;
        try {
            await deleteServiceRecord(recordId);
            records.value = records.value.filter(
                (record) => record.id !== recordId,
            );
        } catch (caught) {
            error.value = errorMessage(caught);
            throw caught;
        }
    }

    function clearScheduleReferences(scheduleId: string): void {
        records.value = records.value.map((record) => ({
            ...record,
            items: record.items.map((item) =>
                item.scheduleId === scheduleId
                    ? { ...item, scheduleId: undefined }
                    : item,
            ),
        }));
    }

    function clearError(): void {
        error.value = null;
    }

    return {
        records,
        loading,
        error,
        loadRecords,
        addRecord,
        updateRecord,
        deleteRecord,
        clearScheduleReferences,
        clearError,
    };
});
