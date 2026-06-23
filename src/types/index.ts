export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    licensePlate?: string;
    engineType?: string;
    currentMileage: number;
}

export interface BaseRecord {
    id: string;
    vehicleId: string;
    date: string;
    mileage: number;
    cost?: number;
    shopName?: string;
    notes?: string;
}

export interface RepairRecord extends BaseRecord {
    type: "REPAIR";
    partReplaced: string;
}

export interface PreventativeRecord extends BaseRecord {
    nextServiceMileage?: number;
    nextServiceDate?: string;
}

export interface OilChangeRecord extends PreventativeRecord {
    type: "OIL_CHANGE";
    filterReplaced: boolean;
    oilType?: string;
}

export interface TireRotationRecord extends PreventativeRecord {
    type: "TIRE_ROTATION";
    treadDepthRemaining?: number;
}

export type MaintenanceRecord = RepairRecord | OilChangeRecord | TireRotationRecord;