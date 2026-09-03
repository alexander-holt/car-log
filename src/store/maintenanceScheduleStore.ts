import {
    createMaintenanceSchedule,
    deleteMaintenanceSchedule,
    loadMaintenanceSchedules,
    updateMaintenanceSchedule,
} from "@/services/maintenanceScheduleRepository";
import type { MaintenanceSchedule } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "An unexpected maintenance schedule error occurred.";
}

export const useMaintenanceScheduleStore = defineStore(
    "maintenanceSchedules",
    () => {
        const schedules = ref<MaintenanceSchedule[]>([]);
        const loading = ref(false);
        const error = ref<string | null>(null);

        async function loadSchedules(vehicleId?: string): Promise<void> {
            loading.value = true;
            error.value = null;
            try {
                const loaded = await loadMaintenanceSchedules(vehicleId);
                schedules.value = vehicleId
                    ? [
                          ...schedules.value.filter(
                              (schedule) => schedule.vehicleId !== vehicleId,
                          ),
                          ...loaded,
                      ]
                    : loaded;
            } catch (caught) {
                error.value = errorMessage(caught);
                throw caught;
            } finally {
                loading.value = false;
            }
        }

        function replaceSchedule(schedule: MaintenanceSchedule): void {
            const index = schedules.value.findIndex(
                (candidate) => candidate.id === schedule.id,
            );
            if (index === -1) {
                schedules.value.push(schedule);
            } else {
                schedules.value[index] = schedule;
            }
        }

        async function addSchedule(
            schedule: MaintenanceSchedule,
        ): Promise<void> {
            error.value = null;
            try {
                replaceSchedule(await createMaintenanceSchedule(schedule));
            } catch (caught) {
                error.value = errorMessage(caught);
                throw caught;
            }
        }

        async function updateSchedule(
            schedule: MaintenanceSchedule,
        ): Promise<void> {
            error.value = null;
            try {
                replaceSchedule(await updateMaintenanceSchedule(schedule));
            } catch (caught) {
                error.value = errorMessage(caught);
                throw caught;
            }
        }

        async function setScheduleEnabled(
            schedule: MaintenanceSchedule,
            enabled: boolean,
        ): Promise<void> {
            await updateSchedule({ ...schedule, enabled });
        }

        async function deleteSchedule(scheduleId: string): Promise<void> {
            error.value = null;
            try {
                await deleteMaintenanceSchedule(scheduleId);
                schedules.value = schedules.value.filter(
                    (schedule) => schedule.id !== scheduleId,
                );
            } catch (caught) {
                error.value = errorMessage(caught);
                throw caught;
            }
        }

        function applyAdvancedSchedules(
            advancedSchedules: MaintenanceSchedule[],
        ): void {
            advancedSchedules.forEach(replaceSchedule);
        }

        function clearError(): void {
            error.value = null;
        }

        return {
            schedules,
            loading,
            error,
            loadSchedules,
            addSchedule,
            updateSchedule,
            setScheduleEnabled,
            deleteSchedule,
            applyAdvancedSchedules,
            clearError,
        };
    },
);
