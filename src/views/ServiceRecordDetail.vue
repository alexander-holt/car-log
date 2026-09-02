<script setup lang="ts">
import ServiceRecordFormModal from "@/components/ServiceRecordFormModal.vue";
import { presentationFor } from "@/services/serviceRecordPresentation";
import {
    formatCost,
    formatLocalDate,
} from "@/services/serviceRecordValidation";
import { useServiceRecordStore } from "@/store/serviceRecordStore";
import { useVehicleStore } from "@/store/vehicleStore";
import type { ServiceItem, ServiceRecord } from "@/types";
import {
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonNote,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
    actionSheetController,
    alertController,
    modalController,
    onIonViewWillEnter,
    toastController,
} from "@ionic/vue";
import { ellipsisHorizontal } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const vehicleStore = useVehicleStore();
const recordStore = useServiceRecordStore();
const attemptedLoad = ref(false);
const saving = ref(false);

const vehicleId = route.params.vehicleId as string;
const recordId = route.params.recordId as string;
const vehicle = computed(() =>
    vehicleStore.vehicles.find((candidate) => candidate.id === vehicleId),
);
const record = computed(() =>
    recordStore.records.find(
        (candidate) =>
            candidate.id === recordId && candidate.vehicleId === vehicleId,
    ),
);

function messageFor(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "An unexpected service record error occurred.";
}

function providerLabel(serviceRecord: ServiceRecord): string {
    const providerType = serviceRecord.providerType === "DIY" ? "DIY" : "Shop";
    return serviceRecord.providerName
        ? `${providerType} · ${serviceRecord.providerName}`
        : providerType;
}

function hasStructuredDetails(item: ServiceItem): boolean {
    if (item.serviceType === "OIL_CHANGE") {
        return true;
    }

    return (
        (item.serviceType === "TIRE_ROTATION" ||
            item.serviceType === "TIRE_REPLACEMENT") &&
        item.treadDepthRemaining !== undefined
    );
}

async function showToast(
    message: string,
    color: "success" | "danger",
): Promise<void> {
    const toast = await toastController.create({
        message,
        color,
        duration: 2500,
        position: "bottom",
    });
    await toast.present();
}

async function fetchRecord(): Promise<void> {
    if (!vehicleId || record.value) {
        attemptedLoad.value = true;
        return;
    }

    try {
        await recordStore.loadRecords(vehicleId);
    } catch {
        // The store error renders below with a retry action.
    } finally {
        attemptedLoad.value = true;
    }
}

onIonViewWillEnter(fetchRecord);

async function openEditModal(): Promise<void> {
    const currentRecord = record.value;
    if (!currentRecord) {
        return;
    }

    const modal = await modalController.create({
        component: ServiceRecordFormModal,
        componentProps: {
            vehicleId,
            record: currentRecord,
            currentMileage: vehicle.value?.currentMileage,
        },
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<ServiceRecord>();
    if (role !== "confirm" || !data) {
        return;
    }

    saving.value = true;
    try {
        await recordStore.updateRecord(data);
        await showToast("Service record updated.", "success");
    } catch (error) {
        await showToast(
            `Could not update service record. ${messageFor(error)}`,
            "danger",
        );
    } finally {
        saving.value = false;
    }
}

async function deleteRecord(): Promise<void> {
    const currentRecord = record.value;
    if (!currentRecord) {
        return;
    }

    saving.value = true;
    try {
        await recordStore.deleteRecord(currentRecord.id);
        await showToast("Service record deleted.", "success");
        await router.replace(`/vehicle/${vehicleId}`);
    } catch (error) {
        await showToast(
            `Could not delete service record. ${messageFor(error)}`,
            "danger",
        );
    } finally {
        saving.value = false;
    }
}

async function confirmDelete(): Promise<void> {
    const currentRecord = record.value;
    if (!currentRecord) {
        return;
    }

    const itemWord = currentRecord.items.length === 1 ? "item" : "items";
    const alert = await alertController.create({
        header: "Delete service record?",
        message: `This will permanently remove the record, its ${currentRecord.items.length} service ${itemWord}, and their details.`,
        buttons: [
            { text: "Cancel", role: "cancel" },
            {
                text: "Delete",
                role: "destructive",
                handler: () => {
                    void deleteRecord();
                },
            },
        ],
    });
    await alert.present();
}

async function openRecordActions(): Promise<void> {
    const actionSheet = await actionSheetController.create({
        header: "Record actions",
        buttons: [
            {
                text: "Delete record",
                role: "destructive",
                handler: () => {
                    void confirmDelete();
                },
            },
            {
                text: "Cancel",
                role: "cancel",
            },
        ],
    });
    await actionSheet.present();
}
</script>

<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button :default-href="`/vehicle/${vehicleId}`" />
                </ion-buttons>
                <ion-title>Service record</ion-title>
                <ion-buttons v-if="record" slot="end">
                    <ion-button :disabled="saving" @click="openEditModal">
                        Edit
                    </ion-button>
                    <ion-button
                        aria-label="More record actions"
                        :disabled="saving"
                        @click="openRecordActions"
                    >
                        <ion-icon slot="icon-only" :icon="ellipsisHorizontal" />
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>

        <ion-content :fullscreen="true">
            <main class="record-page">
                <div
                    v-if="recordStore.loading && !record"
                    class="state-message"
                    aria-live="polite"
                >
                    <ion-spinner name="crescent" />
                    <p>Loading service record…</p>
                </div>

                <div
                    v-else-if="recordStore.error && !record"
                    class="state-message"
                    role="alert"
                >
                    <ion-note color="danger">
                        Could not load service record. {{ recordStore.error }}
                    </ion-note>
                    <ion-button fill="outline" @click="fetchRecord">
                        Retry
                    </ion-button>
                </div>

                <div
                    v-else-if="attemptedLoad && !record"
                    class="state-message"
                    role="alert"
                >
                    <h1>Service record not found</h1>
                    <p>Return to the vehicle history and choose a record.</p>
                </div>

                <template v-else-if="record">
                    <section
                        class="record-overview"
                        aria-labelledby="record-date"
                    >
                        <div class="record-meta">
                            <time id="record-date" :datetime="record.date">
                                {{ formatLocalDate(record.date) }}
                            </time>
                            <span>
                                {{ record.mileage.toLocaleString() }} mi
                            </span>
                        </div>
                        <div class="record-meta record-provider">
                            <span>{{ providerLabel(record) }}</span>
                            <strong v-if="record.totalCostCents !== undefined">
                                {{ formatCost(record.totalCostCents) }}
                            </strong>
                        </div>
                    </section>

                    <section v-if="record.notes" class="record-section">
                        <h2>Record notes</h2>
                        <div class="section-body record-notes">
                            <p>{{ record.notes }}</p>
                        </div>
                    </section>

                    <section
                        class="record-section"
                        aria-labelledby="services-title"
                    >
                        <h2 id="services-title">Services</h2>
                        <div class="service-items">
                            <article
                                v-for="item in record.items"
                                :key="item.id"
                                class="service-item"
                            >
                                <header class="service-item-header">
                                    <span
                                        class="service-item-icon"
                                        :class="`service-tone--${presentationFor(item.serviceType).tone}`"
                                    >
                                        <ion-icon
                                            aria-hidden="true"
                                            :icon="
                                                presentationFor(
                                                    item.serviceType,
                                                ).icon
                                            "
                                        />
                                    </span>
                                    <div>
                                        <h3>
                                            {{
                                                presentationFor(
                                                    item.serviceType,
                                                ).label
                                            }}
                                        </h3>
                                        <p v-if="item.title">
                                            {{ item.title }}
                                        </p>
                                    </div>
                                </header>

                                <dl
                                    v-if="hasStructuredDetails(item)"
                                    class="structured-details"
                                >
                                    <div
                                        v-if="
                                            item.serviceType === 'OIL_CHANGE' &&
                                            item.oilType
                                        "
                                    >
                                        <dt>Oil type</dt>
                                        <dd>{{ item.oilType }}</dd>
                                    </div>
                                    <div
                                        v-if="item.serviceType === 'OIL_CHANGE'"
                                    >
                                        <dt>Oil filter</dt>
                                        <dd>
                                            {{
                                                item.filterReplaced
                                                    ? "Replaced"
                                                    : "Not replaced"
                                            }}
                                        </dd>
                                    </div>
                                    <div
                                        v-if="
                                            (item.serviceType ===
                                                'TIRE_ROTATION' ||
                                                item.serviceType ===
                                                    'TIRE_REPLACEMENT') &&
                                            item.treadDepthRemaining !==
                                                undefined
                                        "
                                    >
                                        <dt>Tread depth</dt>
                                        <dd>
                                            {{ item.treadDepthRemaining }}/32 in
                                        </dd>
                                    </div>
                                </dl>

                                <div v-if="item.notes" class="item-notes">
                                    <h4>Notes</h4>
                                    <p>{{ item.notes }}</p>
                                </div>
                            </article>
                        </div>
                    </section>
                </template>
            </main>

            <div v-if="saving" class="saving-indicator" aria-live="polite">
                <ion-spinner name="crescent" />
                <span>Saving…</span>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.record-page {
    width: min(100%, 46rem);
    margin: 0 auto;
    padding: 1rem var(--cl-page-gutter) 3rem;
}

.record-overview {
    padding: 1rem;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.record-meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.9375rem;
    font-variant-numeric: tabular-nums;
}

.record-meta:first-child {
    font-weight: 650;
}

.record-meta:first-child span,
.record-provider {
    color: var(--cl-text-muted);
}

.record-provider {
    margin-top: 0.375rem;
}

.record-provider strong {
    color: var(--cl-text);
    font-weight: 650;
    white-space: nowrap;
}

.record-section {
    margin-top: 1.5rem;
}

.record-section > h2 {
    margin: 0 0 0.625rem;
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.section-body,
.service-items {
    overflow: hidden;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.record-notes {
    padding: 1rem;
}

.record-notes p,
.item-notes p {
    margin: 0;
    line-height: 1.5;
    white-space: pre-wrap;
}

.service-item {
    padding: 1rem;
}

.service-item + .service-item {
    border-top: 1px solid var(--cl-border);
}

.service-item-header {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    align-items: start;
    gap: 0.75rem;
}

.service-item-icon {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    border-radius: 0.75rem;
    background: var(--cl-service-tone-soft);
    color: var(--cl-service-tone);
}

.service-item-icon ion-icon {
    font-size: 1.25rem;
}

.service-item-header h3 {
    margin: 0.125rem 0 0;
    font-size: 1rem;
    font-weight: 700;
}

.service-item-header p {
    margin: 0.2rem 0 0;
    color: var(--cl-text-muted);
    font-size: 0.9375rem;
    line-height: 1.35;
}

.structured-details {
    margin: 0.875rem 0 0 3.25rem;
}

.structured-details div {
    display: grid;
    grid-template-columns: minmax(7rem, 0.8fr) minmax(0, 1fr);
    gap: 1rem;
    padding: 0.625rem 0;
    border-top: 1px solid var(--cl-border);
}

.structured-details dt {
    color: var(--cl-text-muted);
}

.structured-details dd {
    margin: 0;
    color: var(--cl-text);
    font-weight: 550;
}

.item-notes {
    margin: 0.875rem 0 0 3.25rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--cl-border);
}

.item-notes h4 {
    margin: 0 0 0.3rem;
    color: var(--cl-text-muted);
    font-size: 0.8125rem;
    font-weight: 650;
}

.state-message {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    text-align: center;
}

.state-message > * {
    margin: 0;
}

.saving-indicator {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cl-border);
    border-radius: 999px;
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

@media (max-width: 360px) {
    .structured-details div {
        grid-template-columns: 1fr;
        gap: 0.2rem;
    }
}
</style>
