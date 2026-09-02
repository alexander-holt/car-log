<script setup lang="ts">
import {
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
} from "@ionic/vue";
import {
    cashOutline,
    chevronDownOutline,
    chevronUpOutline,
    documentTextOutline,
    locationOutline,
} from "ionicons/icons";
import { ref } from "vue";
import {
    formatCost,
    formatLocalDate,
} from "@/services/serviceRecordValidation";
import type { ServiceItem, ServiceRecord, ServiceType } from "@/types";

defineProps<{
    record: ServiceRecord;
}>();

defineEmits<{
    edit: [record: ServiceRecord];
    delete: [record: ServiceRecord];
}>();

const expanded = ref(false);

const categoryLabels: Record<ServiceType, string> = {
    OIL_CHANGE: "Oil change",
    TIRE_ROTATION: "Tire rotation",
    TIRE_REPLACEMENT: "Tire replacement",
    BRAKE_SERVICE: "Brake service",
    BATTERY_SERVICE: "Battery service",
    INSPECTION: "Inspection",
    REPAIR: "Repair",
    OTHER: "Other",
};

function itemLabel(item: ServiceItem): string {
    return item.serviceType === "OTHER"
        ? item.title
        : (item.title ?? categoryLabels[item.serviceType]);
}
</script>

<template>
    <ion-card class="service-record-card">
        <ion-card-header>
            <ion-card-title>{{ formatLocalDate(record.date) }}</ion-card-title>
            <ion-card-subtitle>
                {{ record.mileage.toLocaleString() }} mi ·
                {{ record.providerType === "DIY" ? "DIY" : "Shop" }}
            </ion-card-subtitle>
            <div class="category-chips" aria-label="Service categories">
                <ion-chip
                    v-for="item in record.items"
                    :key="item.id"
                    color="primary"
                >
                    {{ categoryLabels[item.serviceType] }}
                </ion-chip>
            </div>
        </ion-card-header>

        <ion-card-content>
            <ion-list lines="none">
                <ion-item v-if="record.providerName">
                    <ion-icon slot="start" :icon="locationOutline" />
                    <ion-label>{{ record.providerName }}</ion-label>
                </ion-item>
                <ion-item v-if="record.totalCostCents !== undefined">
                    <ion-icon slot="start" :icon="cashOutline" />
                    <ion-label>
                        {{ formatCost(record.totalCostCents) }}
                    </ion-label>
                </ion-item>
                <ion-item v-if="record.notes">
                    <ion-icon slot="start" :icon="documentTextOutline" />
                    <ion-label class="ion-text-wrap">
                        {{ record.notes }}
                    </ion-label>
                </ion-item>
            </ion-list>

            <div v-if="expanded" class="record-details">
                <section
                    v-for="item in record.items"
                    :key="item.id"
                    class="service-item-details"
                >
                    <h3>{{ itemLabel(item) }}</h3>
                    <p class="item-category">
                        {{ categoryLabels[item.serviceType] }}
                    </p>
                    <p v-if="item.serviceType === 'OIL_CHANGE' && item.oilType">
                        <strong>Oil:</strong>
                        {{ item.oilType }}
                    </p>
                    <p v-if="item.serviceType === 'OIL_CHANGE'">
                        <strong>Filter replaced:</strong>
                        {{ item.filterReplaced ? "Yes" : "No" }}
                    </p>
                    <p
                        v-if="
                            (item.serviceType === 'TIRE_ROTATION' ||
                                item.serviceType === 'TIRE_REPLACEMENT') &&
                            item.treadDepthRemaining !== undefined
                        "
                    >
                        <strong>Tread depth:</strong>
                        {{ item.treadDepthRemaining }}/32 in
                    </p>
                    <p v-if="item.notes">{{ item.notes }}</p>
                </section>
            </div>

            <ion-buttons class="card-actions">
                <ion-button fill="clear" @click="expanded = !expanded">
                    <ion-icon
                        slot="start"
                        :icon="expanded ? chevronUpOutline : chevronDownOutline"
                    />
                    {{ expanded ? "Hide details" : "View details" }}
                </ion-button>
                <ion-button fill="clear" @click="$emit('edit', record)">
                    Edit
                </ion-button>
                <ion-button
                    fill="clear"
                    color="danger"
                    @click="$emit('delete', record)"
                >
                    Delete
                </ion-button>
            </ion-buttons>
        </ion-card-content>
    </ion-card>
</template>

<style scoped>
.category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.75rem;
}

.category-chips ion-chip {
    margin: 0;
}

.record-details {
    border-top: 1px solid var(--ion-color-step-150, #d7d8da);
    margin-top: 0.75rem;
    padding-top: 0.5rem;
}

.service-item-details + .service-item-details {
    border-top: 1px solid var(--ion-color-step-100, #e6e6e6);
}

.service-item-details {
    padding: 0.5rem 0;
}

.service-item-details h3,
.service-item-details p {
    margin: 0.25rem 0;
}

.item-category {
    color: var(--ion-color-medium);
    font-size: 0.85rem;
}

.card-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-top: 0.5rem;
}
</style>
