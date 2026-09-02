<script setup lang="ts">
import {
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToggle,
    IonToolbar,
    modalController,
} from "@ionic/vue";
import { computed, reactive } from "vue";
import { v4 as uuidv4 } from "uuid";
import {
    getLocalDateString,
    normalizeOptionalText,
    parseCostToCents,
    validateServiceRecord,
    type ValidationIssue,
} from "@/services/serviceRecordValidation";
import {
    SERVICE_TYPES,
    type ProviderType,
    type ServiceItem,
    type ServiceRecord,
    type ServiceType,
} from "@/types";

const props = defineProps<{
    vehicleId: string;
    record?: ServiceRecord;
    currentMileage?: number;
}>();

interface EditableItem {
    id: string;
    serviceType: ServiceType;
    title: string;
    notes: string;
    scheduleId?: string;
    oilType: string;
    filterReplaced: boolean;
    treadDepthRemaining: string | number | null;
}

interface FormState {
    date: string;
    mileage: string | number | null;
    providerType: ProviderType;
    providerName: string;
    cost: string;
    notes: string;
    items: EditableItem[];
}

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

const today = getLocalDateString();
const recordId = props.record?.id ?? uuidv4();
const isEditMode = computed(() => props.record !== undefined);

function toEditableItem(item: ServiceItem): EditableItem {
    return {
        id: item.id,
        serviceType: item.serviceType,
        title: item.title ?? "",
        notes: item.notes ?? "",
        scheduleId: item.scheduleId,
        oilType: item.serviceType === "OIL_CHANGE" ? (item.oilType ?? "") : "",
        filterReplaced:
            item.serviceType === "OIL_CHANGE" ? item.filterReplaced : false,
        treadDepthRemaining:
            item.serviceType === "TIRE_ROTATION" ||
            item.serviceType === "TIRE_REPLACEMENT"
                ? (item.treadDepthRemaining ?? null)
                : null,
    };
}

function newItem(): EditableItem {
    return {
        id: uuidv4(),
        serviceType: "OIL_CHANGE",
        title: "",
        notes: "",
        oilType: "",
        filterReplaced: false,
        treadDepthRemaining: null,
    };
}

const formData = reactive<FormState>({
    date: props.record?.date ?? today,
    mileage: props.record?.mileage ?? props.currentMileage ?? null,
    providerType: props.record?.providerType ?? "DIY",
    providerName: props.record?.providerName ?? "",
    cost:
        props.record?.totalCostCents === undefined
            ? ""
            : (props.record.totalCostCents / 100).toFixed(2),
    notes: props.record?.notes ?? "",
    items: props.record?.items.map(toEditableItem) ?? [newItem()],
});

function optionalNumber(value: string | number | null): number | undefined {
    if (value === null || String(value).trim() === "") {
        return undefined;
    }
    return Number(value);
}

function buildItem(item: EditableItem): ServiceItem {
    const shared = {
        id: item.id,
        serviceRecordId: recordId,
        title: normalizeOptionalText(item.title),
        notes: normalizeOptionalText(item.notes),
        scheduleId: item.scheduleId,
    };

    switch (item.serviceType) {
        case "OIL_CHANGE":
            return {
                ...shared,
                serviceType: "OIL_CHANGE",
                oilType: normalizeOptionalText(item.oilType),
                filterReplaced: item.filterReplaced,
            };
        case "TIRE_ROTATION":
        case "TIRE_REPLACEMENT":
            return {
                ...shared,
                serviceType: item.serviceType,
                treadDepthRemaining: optionalNumber(item.treadDepthRemaining),
            };
        case "OTHER":
            return {
                ...shared,
                serviceType: "OTHER",
                title: item.title.trim(),
            };
        case "BRAKE_SERVICE":
        case "BATTERY_SERVICE":
        case "INSPECTION":
        case "REPAIR":
            return {
                ...shared,
                serviceType: item.serviceType,
            };
    }
}

function buildRecord(): ServiceRecord {
    return {
        id: recordId,
        vehicleId: props.vehicleId,
        date: formData.date,
        mileage:
            formData.mileage === null || String(formData.mileage).trim() === ""
                ? Number.NaN
                : Number(formData.mileage),
        providerType: formData.providerType,
        providerName: normalizeOptionalText(formData.providerName),
        totalCostCents: parseCostToCents(formData.cost),
        notes: normalizeOptionalText(formData.notes),
        items: formData.items.map(buildItem),
    };
}

const validationIssues = computed<ValidationIssue[]>(() => {
    try {
        return validateServiceRecord(buildRecord(), today);
    } catch (error) {
        return [
            {
                path: "totalCostCents",
                message:
                    error instanceof Error
                        ? error.message
                        : "Enter a valid cost.",
            },
        ];
    }
});

const isFormValid = computed(() => validationIssues.value.length === 0);

function errorFor(path: string): string | undefined {
    return validationIssues.value.find((issue) => issue.path === path)?.message;
}

function addItem(): void {
    formData.items.push(newItem());
}

function removeItem(index: number): void {
    if (formData.items.length > 1) {
        formData.items.splice(index, 1);
    }
}

function cancel(): void {
    void modalController.dismiss(null, "cancel");
}

function saveRecord(): void {
    if (!isFormValid.value) {
        return;
    }
    void modalController.dismiss(buildRecord(), "confirm");
}
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-title>
                {{ isEditMode ? "Edit service record" : "Add service record" }}
            </ion-title>
            <ion-buttons slot="end">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
        <ion-list lines="full">
            <ion-item>
                <ion-input
                    v-model="formData.date"
                    label="Service date *"
                    label-placement="stacked"
                    type="date"
                    :max="today"
                    required
                />
            </ion-item>
            <ion-note
                v-if="errorFor('date')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("date") }}
            </ion-note>

            <ion-item>
                <ion-input
                    v-model="formData.mileage"
                    label="Mileage *"
                    label-placement="stacked"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    required
                />
            </ion-item>
            <ion-note
                v-if="errorFor('mileage')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("mileage") }}
            </ion-note>

            <ion-item lines="none">
                <ion-label>Provider *</ion-label>
                <ion-segment
                    v-model="formData.providerType"
                    aria-label="Provider type"
                >
                    <ion-segment-button value="DIY">
                        <ion-label>DIY</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="SHOP">
                        <ion-label>Shop</ion-label>
                    </ion-segment-button>
                </ion-segment>
            </ion-item>

            <ion-item>
                <ion-input
                    v-model="formData.providerName"
                    :label="
                        formData.providerType === 'SHOP'
                            ? 'Shop name (optional)'
                            : 'Person name (optional)'
                    "
                    label-placement="stacked"
                    :maxlength="120"
                />
            </ion-item>

            <ion-item>
                <ion-input
                    v-model="formData.cost"
                    label="Total cost (optional)"
                    label-placement="stacked"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.01"
                />
            </ion-item>
            <ion-note
                v-if="errorFor('totalCostCents')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("totalCostCents") }}
            </ion-note>

            <ion-item>
                <ion-textarea
                    v-model="formData.notes"
                    label="Record notes (optional)"
                    label-placement="stacked"
                    :rows="3"
                    :maxlength="2000"
                />
            </ion-item>
        </ion-list>

        <section class="items-section" aria-labelledby="service-items-title">
            <h2 id="service-items-title">Service items</h2>

            <ion-card
                v-for="(item, index) in formData.items"
                :key="item.id"
                class="service-item-card"
            >
                <ion-card-header>
                    <ion-card-title>Item {{ index + 1 }}</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                    <ion-list lines="full">
                        <ion-item>
                            <ion-select
                                v-model="item.serviceType"
                                label="Category *"
                                label-placement="stacked"
                                interface="action-sheet"
                            >
                                <ion-select-option
                                    v-for="serviceType in SERVICE_TYPES"
                                    :key="serviceType"
                                    :value="serviceType"
                                >
                                    {{ categoryLabels[serviceType] }}
                                </ion-select-option>
                            </ion-select>
                        </ion-item>

                        <ion-item>
                            <ion-input
                                v-model="item.title"
                                :label="
                                    item.serviceType === 'OTHER'
                                        ? 'Title *'
                                        : 'Item title (optional)'
                                "
                                label-placement="stacked"
                                :maxlength="120"
                            />
                        </ion-item>
                        <ion-note
                            v-if="errorFor(`items.${index}.title`)"
                            color="danger"
                            class="field-error"
                        >
                            {{ errorFor(`items.${index}.title`) }}
                        </ion-note>

                        <template v-if="item.serviceType === 'OIL_CHANGE'">
                            <ion-item>
                                <ion-input
                                    v-model="item.oilType"
                                    label="Oil type (optional)"
                                    label-placement="stacked"
                                    placeholder="0W-20 full synthetic"
                                    :maxlength="100"
                                />
                            </ion-item>
                            <ion-note
                                v-if="errorFor(`items.${index}.oilType`)"
                                color="danger"
                                class="field-error"
                            >
                                {{ errorFor(`items.${index}.oilType`) }}
                            </ion-note>
                            <ion-item lines="none">
                                <ion-toggle
                                    v-model="item.filterReplaced"
                                    justify="space-between"
                                >
                                    Oil filter replaced
                                </ion-toggle>
                            </ion-item>
                        </template>

                        <template
                            v-if="
                                item.serviceType === 'TIRE_ROTATION' ||
                                item.serviceType === 'TIRE_REPLACEMENT'
                            "
                        >
                            <ion-item>
                                <ion-input
                                    v-model="item.treadDepthRemaining"
                                    label="Tread depth in 32nds (optional)"
                                    label-placement="stacked"
                                    type="number"
                                    inputmode="decimal"
                                    min="0"
                                    max="32"
                                    step="0.1"
                                />
                            </ion-item>
                            <ion-note
                                v-if="
                                    errorFor(
                                        `items.${index}.treadDepthRemaining`,
                                    )
                                "
                                color="danger"
                                class="field-error"
                            >
                                {{
                                    errorFor(
                                        `items.${index}.treadDepthRemaining`,
                                    )
                                }}
                            </ion-note>
                        </template>

                        <ion-item>
                            <ion-textarea
                                v-model="item.notes"
                                label="Item notes (optional)"
                                label-placement="stacked"
                                :rows="2"
                                :maxlength="1000"
                            />
                        </ion-item>
                    </ion-list>

                    <ion-button
                        fill="clear"
                        color="danger"
                        :disabled="formData.items.length === 1"
                        :aria-label="`Remove item ${index + 1}`"
                        @click="removeItem(index)"
                    >
                        Remove item
                    </ion-button>
                </ion-card-content>
            </ion-card>

            <ion-note
                v-if="errorFor('items')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("items") }}
            </ion-note>
            <ion-button expand="block" fill="outline" @click="addItem">
                Add service item
            </ion-button>
        </section>

        <ion-button
            expand="block"
            class="ion-margin-top ion-margin-bottom"
            :disabled="!isFormValid"
            @click="saveRecord"
        >
            {{ isEditMode ? "Update service record" : "Save service record" }}
        </ion-button>
    </ion-content>
</template>

<style scoped>
.items-section {
    margin-top: 1.5rem;
}

.items-section h2 {
    margin-inline: 0.25rem;
    font-size: 1.25rem;
}

.service-item-card {
    margin-inline: 0;
}

.field-error {
    display: block;
    margin: 0.25rem 1rem 0.75rem;
}
</style>
