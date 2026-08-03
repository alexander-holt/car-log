<script setup lang="ts">
import { computed, reactive } from "vue";
import {
    modalController,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonToggle,
    IonTextarea,
} from "@ionic/vue";
import { MaintenanceRecord } from "../types";

const props = defineProps<{
    record?: MaintenanceRecord;
    currentMileage?: number;
}>();

const isEditMode = computed(() => !!props.record);

// Get today's date formatted as YYYY-MM-DD for the default date input
const today = new Date().toISOString().split("T")[0];

// We use type assertions (as any) on optional props to safely map the discriminated union fields
const formData = reactive({
    // base
    type: props.record?.type || "OIL_CHANGE",
    date: props.record?.date || today,
    mileage: props.record?.mileage ?? props.currentMileage ?? null,
    cost: props.record?.cost ?? null,
    shopName: props.record?.shopName || "",
    notes: props.record?.notes || "",

    // preventative
    nextServiceMileage: (props.record as any)?.nextServiceMileage ?? null,
    nextServiceDate: (props.record as any)?.nextServiceDate || "",

    // oil change
    filterReplaced:
        props.record?.type === "OIL_CHANGE"
            ? props.record.filterReplaced
            : false,
    oilType: (props.record as any)?.oilType || "",

    // repair
    partReplaced: (props.record as any)?.partReplaced || "",

    // tire rotation
    treadDepthRemaining: (props.record as any)?.treadDepthRemaining ?? null,
});

const isFormValid = computed(() => {
    const hasMileage =
        formData.mileage !== null && String(formData.mileage).trim() !== "";

    if (!formData.date || !hasMileage) {
        return false;
    }

    if (formData.type === "REPAIR" && formData.partReplaced.trim() === "") {
        return false;
    }

    return true;
});

const cancel = () => {
    modalController.dismiss(null, "cancel");
};

const saveRecord = () => {
    // Construct a clean object without undefined/empty fields to return to the parent
    const baseData = {
        date: formData.date,
        mileage: Number(formData.mileage),
        cost: formData.cost ? Number(formData.cost) : undefined,
        shopName: formData.shopName.trim() || undefined,
        notes: formData.notes.trim() || undefined,
    };

    let resultPayload;

    if (formData.type === "REPAIR") {
        resultPayload = {
            ...baseData,
            type: "REPAIR",
            partReplaced: formData.partReplaced.trim(),
        };
    } else if (formData.type === "OIL_CHANGE") {
        resultPayload = {
            ...baseData,
            type: "OIL_CHANGE",
            filterReplaced: formData.filterReplaced,
            oilType: formData.oilType.trim() || undefined,
            nextServiceMileage: formData.nextServiceMileage
                ? Number(formData.nextServiceMileage)
                : undefined,
            nextServiceDate: formData.nextServiceDate || undefined,
        };
    } else {
        resultPayload = {
            ...baseData,
            type: "TIRE_ROTATION",
            treadDepthRemaining: formData.treadDepthRemaining
                ? Number(formData.treadDepthRemaining)
                : undefined,
            nextServiceMileage: formData.nextServiceMileage
                ? Number(formData.nextServiceMileage)
                : undefined,
            nextServiceDate: formData.nextServiceDate || undefined,
        };
    }

    modalController.dismiss(resultPayload, "confirm");
};
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-title>
                {{ isEditMode ? "Edit Record" : "Add Record" }}
            </ion-title>
            <ion-buttons slot="end">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
        </ion-toolbar>
        <ion-toolbar>
            <ion-segment v-model="formData.type" :disabled="isEditMode">
                <ion-segment-button value="OIL_CHANGE">
                    <ion-label>Oil Change</ion-label>
                </ion-segment-button>
                <ion-segment-button value="TIRE_ROTATION">
                    <ion-label>Tire Rotation</ion-label>
                </ion-segment-button>
                <ion-segment-button value="REPAIR">
                    <ion-label>Repair</ion-label>
                </ion-segment-button>
            </ion-segment>
        </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
        <ion-list>
            <!-- Shared Fields -->
            <ion-item>
                <ion-input
                    v-model="formData.date"
                    label="Date *"
                    label-placement="floating"
                    type="date"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.mileage"
                    label="Mileage *"
                    label-placement="floating"
                    type="number"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.cost"
                    label="Cost ($)"
                    label-placement="floating"
                    type="number"
                    step="0.01"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.shopName"
                    label="Shop Name"
                    label-placement="floating"
                    placeholder="e.g., Jiffy Lube"
                ></ion-input>
            </ion-item>

            <!-- Dynamic Repair Fields -->
            <template v-if="formData.type === 'REPAIR'">
                <ion-item>
                    <ion-input
                        v-model="formData.partReplaced"
                        label="Part Replaced *"
                        label-placement="floating"
                        placeholder="e.g., Alternator"
                        required
                    ></ion-input>
                </ion-item>
            </template>

            <!-- Dynamic Oil Change Fields -->
            <template v-if="formData.type === 'OIL_CHANGE'">
                <ion-item>
                    <ion-input
                        v-model="formData.oilType"
                        label="Oil Type"
                        label-placement="floating"
                        placeholder="e.g., 0W-20 Full Synthetic"
                    ></ion-input>
                </ion-item>
                <ion-item lines="none" class="ion-margin-top">
                    <ion-toggle
                        v-model="formData.filterReplaced"
                        justify="space-between"
                    >
                        Filter Replaced
                    </ion-toggle>
                </ion-item>
            </template>

            <!-- Dynamic Tire Rotation Fields -->
            <template v-if="formData.type === 'TIRE_ROTATION'">
                <ion-item>
                    <ion-input
                        v-model="formData.treadDepthRemaining"
                        label="Tread Depth (32nds)"
                        label-placement="floating"
                        type="number"
                        step="0.1"
                    ></ion-input>
                </ion-item>
            </template>

            <!-- Dynamic Preventative Fields (Oil or Tire) -->
            <template
                v-if="
                    formData.type === 'OIL_CHANGE' ||
                    formData.type === 'TIRE_ROTATION'
                "
            >
                <ion-item class="ion-margin-top">
                    <ion-input
                        v-model="formData.nextServiceMileage"
                        label="Next Service Mileage"
                        label-placement="floating"
                        type="number"
                    ></ion-input>
                </ion-item>
                <ion-item>
                    <ion-input
                        v-model="formData.nextServiceDate"
                        label="Next Service Date"
                        label-placement="floating"
                        type="date"
                    ></ion-input>
                </ion-item>
            </template>

            <ion-item class="ion-margin-top">
                <ion-textarea
                    v-model="formData.notes"
                    label="Notes"
                    label-placement="floating"
                    :rows="3"
                ></ion-textarea>
            </ion-item>
        </ion-list>

        <ion-button
            expand="block"
            class="ion-margin-top ion-margin-bottom"
            :disabled="!isFormValid"
            @click="saveRecord"
        >
            {{ isEditMode ? "Update Record" : "Save Record" }}
        </ion-button>
    </ion-content>
</template>
