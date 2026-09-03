import {
    apertureOutline,
    batteryChargingOutline,
    buildOutline,
    ellipsisHorizontalCircleOutline,
    shieldCheckmarkOutline,
    stopCircleOutline,
    syncOutline,
    waterOutline,
} from "ionicons/icons";
import type { ServiceType } from "@/types";

export type ServiceTone =
    | "oil"
    | "tire"
    | "inspection"
    | "repair"
    | "battery"
    | "other";

export interface ServiceTypePresentation {
    label: string;
    icon: string;
    tone: ServiceTone;
}

export const SERVICE_TYPE_PRESENTATION: Record<
    ServiceType,
    ServiceTypePresentation
> = {
    OIL_CHANGE: {
        label: "Oil change",
        icon: waterOutline,
        tone: "oil",
    },
    TIRE_ROTATION: {
        label: "Tire rotation",
        icon: syncOutline,
        tone: "tire",
    },
    TIRE_REPLACEMENT: {
        label: "Tire replacement",
        icon: apertureOutline,
        tone: "tire",
    },
    BRAKE_SERVICE: {
        label: "Brake service",
        icon: stopCircleOutline,
        tone: "repair",
    },
    BATTERY_SERVICE: {
        label: "Battery service",
        icon: batteryChargingOutline,
        tone: "battery",
    },
    INSPECTION: {
        label: "Inspection",
        icon: shieldCheckmarkOutline,
        tone: "inspection",
    },
    REPAIR: {
        label: "Repair",
        icon: buildOutline,
        tone: "repair",
    },
    OTHER: {
        label: "Other",
        icon: ellipsisHorizontalCircleOutline,
        tone: "other",
    },
};

export function presentationFor(
    serviceType: ServiceType,
): ServiceTypePresentation {
    return SERVICE_TYPE_PRESENTATION[serviceType];
}
