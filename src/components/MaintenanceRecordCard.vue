<script setup lang="ts">
import {
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
} from "@ionic/vue";
import { MaintenanceRecord } from "@/types";
import {
    buildOutline,
    locationOutline,
    cashOutline,
    documentTextOutline,
    syncOutline,
    waterOutline,
} from "ionicons/icons";

const { record } = defineProps<{
    record: MaintenanceRecord;
}>();

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

const formatRecordType = (type: string) => {
    return type
        .toLowerCase()
        .replaceAll("_", " ")
        .replaceAll(/\b\w/g, (c) => c.toUpperCase());
};

const getRecordIcon = (type: string) => {
    switch (type) {
        case "REPAIR":
            return buildOutline;
        case "OIL_CHANGE":
            return waterOutline;
        case "TIRE_ROTATION":
            return syncOutline;
        default:
            return documentTextOutline;
    }
};
</script>

<template>
    <ion-card>
        <ion-card-header>
            <ion-card-title class="card-title-flex">
                <ion-icon
                    :icon="getRecordIcon(record.type)"
                    class="ion-margin-end"
                ></ion-icon>
                {{ formatRecordType(record.type) }}
            </ion-card-title>
            <ion-card-subtitle>
                {{ formatDate(record.date) }} |
                {{ record.mileage.toLocaleString() }} mi
            </ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
            <!-- Type Dependent Record Details -->

            <!-- Repair Record -->
            <div v-if="record.type === 'REPAIR'" class="record-details">
                <ion-badge>Repair</ion-badge>
                <p>
                    <strong>Part Replaced:</strong>
                    {{ record.partReplaced }}
                </p>
            </div>

            <!-- Oil Change Record -->
            <div
                v-else-if="record.type === 'OIL_CHANGE'"
                class="record-details"
            >
                <ion-badge>Oil Change</ion-badge>
                <p v-if="record.oilType">
                    <strong>Oil Type:</strong>
                    {{ record.oilType }}
                </p>
                <p>
                    <strong>Filter Replaced:</strong>
                    {{ record.filterReplaced ? "Yes" : "No" }}
                </p>
            </div>

            <!-- Tire Rotation Record -->
            <div
                v-else-if="record.type === 'TIRE_ROTATION'"
                class="record-details"
            >
                <ion-badge>Tire Rotation</ion-badge>
                <p v-if="record.treadDepthRemaining">
                    <strong>Remaining Tread:</strong>
                    {{ record.treadDepthRemaining }}/32"
                </p>
            </div>

            <!-- Common Record Details -->
            <ion-list>
                <ion-item v-if="record.shopName">
                    <ion-icon slot="start" :icon="locationOutline"></ion-icon>
                    <ion-label>{{ record.shopName }}</ion-label>
                </ion-item>
                <ion-item v-if="record.cost">
                    <ion-icon slot="start" :icon="cashOutline"></ion-icon>
                    <ion-label>${{ record.cost.toFixed(2) }}</ion-label>
                </ion-item>
                <ion-item v-if="record.notes">
                    <ion-icon
                        slot="start"
                        :icon="documentTextOutline"
                    ></ion-icon>
                    <ion-label class="ion-text-wrap">
                        {{ record.notes }}
                    </ion-label>
                </ion-item>
            </ion-list>
        </ion-card-content>
    </ion-card>
</template>

<style scoped>
.card-title-flex {
    display: flex;
    align-items: center;
}
/* Adds a nice visual box around the type-specific details */
.record-details {
    background: var(--ion-color-step-50, #f2f2f2);
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 8px;
}

/* Removes the default top margin from the first paragraph after the badge */
.record-details p {
    margin: 8px 0 0 0;
    font-size: 0.95em;
}
</style>
