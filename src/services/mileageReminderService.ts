import type { Vehicle } from "@/types";

const MILLISECONDS_PER_DAY = 86_400_000;

export function isMileageUpdateDue(
    vehicle: Vehicle,
    now = new Date(),
): boolean {
    if (vehicle.mileageRemindersEnabled === false) {
        return false;
    }
    if (vehicle.currentMileage === undefined || !vehicle.mileageUpdatedAt) {
        return true;
    }

    const updatedAt = new Date(vehicle.mileageUpdatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
        return true;
    }

    const intervalDays = vehicle.mileageReminderIntervalDays ?? 30;
    return (
        now.getTime() - updatedAt.getTime() >=
        intervalDays * MILLISECONDS_PER_DAY
    );
}
