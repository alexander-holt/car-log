export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    licensePlate?: string;
    engineType?: string;
    currentMileage?: number;
    mileageUpdatedAt?: string;
    mileageReminderIntervalDays?: number;
    mileageRemindersEnabled?: boolean;
}

export const SERVICE_TYPES = [
    "OIL_CHANGE",
    "TIRE_ROTATION",
    "TIRE_REPLACEMENT",
    "BRAKE_SERVICE",
    "BATTERY_SERVICE",
    "INSPECTION",
    "REPAIR",
    "OTHER",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type ProviderType = "DIY" | "SHOP";

export interface MaintenanceSchedule {
    id: string;
    vehicleId: string;
    serviceType: ServiceType;
    label?: string;
    intervalMileage?: number;
    intervalMonths?: number;
    nextDueMileage?: number;
    nextDueDate?: string;
    reminderLeadMileage?: number;
    reminderLeadDays?: number;
    notificationId?: number;
    enabled: boolean;
    lastCompletedServiceItemId?: string;
}

export type MaintenanceDueState = "UPCOMING" | "DUE_SOON" | "OVERDUE";

interface BaseServiceItem {
    id: string;
    serviceRecordId: string;
    serviceType: ServiceType;
    title?: string;
    notes?: string;
    scheduleId?: string;
}

export interface OilChangeServiceItem extends BaseServiceItem {
    serviceType: "OIL_CHANGE";
    oilType?: string;
    filterReplaced: boolean;
}

export interface TireServiceItem extends BaseServiceItem {
    serviceType: "TIRE_ROTATION" | "TIRE_REPLACEMENT";
    treadDepthRemaining?: number;
}

export interface OtherServiceItem extends BaseServiceItem {
    serviceType: "OTHER";
    title: string;
}

export interface StandardServiceItem extends BaseServiceItem {
    serviceType: "BRAKE_SERVICE" | "BATTERY_SERVICE" | "INSPECTION" | "REPAIR";
}

export type ServiceItem =
    | OilChangeServiceItem
    | TireServiceItem
    | OtherServiceItem
    | StandardServiceItem;

export interface ServiceRecord {
    id: string;
    vehicleId: string;
    date: string;
    mileage: number;
    providerType: ProviderType;
    providerName?: string;
    totalCostCents?: number;
    notes?: string;
    items: ServiceItem[];
}
