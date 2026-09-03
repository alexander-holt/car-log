<script setup lang="ts">
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    modalController,
} from "@ionic/vue";
import { computed, reactive, ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { presentationFor } from "@/services/serviceRecordPresentation";
import {
    normalizeMaintenanceSchedule,
    validateMaintenanceSchedule,
} from "@/services/maintenanceScheduleService";
import {
    SERVICE_TYPES,
    type MaintenanceSchedule,
    type ServiceType,
} from "@/types";

const props = defineProps<{
    vehicleId: string;
    schedule?: MaintenanceSchedule;
}>();

const formData = reactive({
    serviceType: props.schedule?.serviceType ?? ("OIL_CHANGE" as ServiceType),
    label: props.schedule?.label ?? "",
    intervalMileage: props.schedule?.intervalMileage ?? null,
    intervalMonths: props.schedule?.intervalMonths ?? null,
    nextDueMileage: props.schedule?.nextDueMileage ?? null,
    nextDueDate: props.schedule?.nextDueDate ?? "",
    reminderLeadMileage: props.schedule?.reminderLeadMileage ?? null,
    reminderLeadDays: props.schedule?.reminderLeadDays ?? null,
});
const showValidationErrors = ref(false);
const isEditMode = computed(() => props.schedule !== undefined);

function optionalNumber(value: string | number | null): number | undefined {
    return value === null || String(value).trim() === ""
        ? undefined
        : Number(value);
}

function buildSchedule(): MaintenanceSchedule {
    const nextDueMileage = optionalNumber(formData.nextDueMileage);
    const nextDueDate = formData.nextDueDate || undefined;

    return normalizeMaintenanceSchedule({
        id: props.schedule?.id ?? uuidv4(),
        vehicleId: props.vehicleId,
        serviceType: formData.serviceType,
        label: formData.label,
        intervalMileage:
            nextDueMileage === undefined
                ? undefined
                : optionalNumber(formData.intervalMileage),
        intervalMonths:
            nextDueDate === undefined
                ? undefined
                : optionalNumber(formData.intervalMonths),
        nextDueMileage,
        nextDueDate,
        reminderLeadMileage:
            nextDueMileage === undefined
                ? undefined
                : optionalNumber(formData.reminderLeadMileage),
        reminderLeadDays:
            nextDueDate === undefined
                ? undefined
                : optionalNumber(formData.reminderLeadDays),
        notificationId: props.schedule?.notificationId,
        enabled: props.schedule?.enabled ?? true,
        lastCompletedServiceItemId: props.schedule?.lastCompletedServiceItemId,
    });
}

const hasMileageDue = computed(
    () => optionalNumber(formData.nextDueMileage) !== undefined,
);
const hasDateDue = computed(() => formData.nextDueDate.trim().length > 0);

const validationIssues = computed(() =>
    validateMaintenanceSchedule(buildSchedule()),
);
const isFormValid = computed(() => validationIssues.value.length === 0);

function errorFor(path: string): string | undefined {
    if (!showValidationErrors.value) {
        return undefined;
    }
    return validationIssues.value.find((issue) => issue.path === path)?.message;
}

function cancel(): void {
    void modalController.dismiss(null, "cancel");
}

function saveSchedule(): void {
    showValidationErrors.value = true;
    if (!isFormValid.value) {
        return;
    }
    void modalController.dismiss(buildSchedule(), "confirm");
}
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-buttons slot="start">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
            <ion-title>
                {{ isEditMode ? "Edit schedule" : "Add schedule" }}
            </ion-title>
            <ion-buttons slot="end">
                <ion-button @click="saveSchedule">Save</ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-content>
        <form class="cl-form schedule-form" @submit.prevent="saveSchedule">
            <ion-note
                v-if="showValidationErrors && !isFormValid"
                class="validation-summary"
                color="danger"
                role="alert"
            >
                Schedule not saved. {{ validationIssues.length }}
                {{
                    validationIssues.length === 1
                        ? "field needs"
                        : "fields need"
                }}
                attention.
            </ion-note>

            <section aria-labelledby="schedule-service-title">
                <h2 id="schedule-service-title">Service</h2>
                <ion-list class="form-group" lines="full">
                    <ion-item>
                        <ion-select
                            v-model="formData.serviceType"
                            label="Category *"
                            label-placement="stacked"
                            interface="action-sheet"
                        >
                            <ion-select-option
                                v-for="serviceType in SERVICE_TYPES"
                                :key="serviceType"
                                :value="serviceType"
                            >
                                {{ presentationFor(serviceType).label }}
                            </ion-select-option>
                        </ion-select>
                    </ion-item>
                    <ion-item v-if="formData.serviceType === 'OTHER'">
                        <ion-input
                            v-model="formData.label"
                            data-field-path="label"
                            label="Maintenance label *"
                            label-placement="stacked"
                            placeholder="Differential fluid"
                            :maxlength="120"
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('label')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("label") }}
                    </ion-note>
                </ion-list>
            </section>

            <section aria-labelledby="next-due-title">
                <h2 id="next-due-title">Next due</h2>
                <p class="section-description">
                    Choose mileage, a date, or both. CarLog will use the repeat
                    interval to calculate what comes next after you log the
                    service.
                </p>
                <ion-list class="form-group" lines="full">
                    <ion-item>
                        <ion-input
                            v-model="formData.nextDueMileage"
                            data-field-path="nextDueMileage"
                            label="Next due mileage"
                            label-placement="stacked"
                            placeholder="e.g. 50000"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            step="1"
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('nextDueMileage')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("nextDueMileage") }}
                    </ion-note>
                    <ion-item v-if="hasMileageDue">
                        <ion-input
                            v-model="formData.intervalMileage"
                            data-field-path="intervalMileage"
                            label="Repeat every"
                            label-placement="stacked"
                            placeholder="e.g. 5000"
                            type="number"
                            inputmode="numeric"
                            min="1"
                            step="1"
                        >
                            <span slot="end">mi after service</span>
                        </ion-input>
                    </ion-item>
                    <ion-note
                        v-if="errorFor('intervalMileage')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("intervalMileage") }}
                    </ion-note>
                    <ion-item>
                        <ion-input
                            v-model="formData.nextDueDate"
                            data-field-path="nextDueDate"
                            label="Next due date"
                            label-placement="stacked"
                            type="date"
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('nextDueDate')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("nextDueDate") }}
                    </ion-note>
                    <ion-item v-if="hasDateDue">
                        <ion-input
                            v-model="formData.intervalMonths"
                            data-field-path="intervalMonths"
                            label="Repeat every"
                            label-placement="stacked"
                            placeholder="e.g. 6"
                            type="number"
                            inputmode="numeric"
                            min="1"
                            step="1"
                        >
                            <span slot="end">months after service</span>
                        </ion-input>
                    </ion-item>
                    <ion-note
                        v-if="errorFor('intervalMonths')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("intervalMonths") }}
                    </ion-note>
                </ion-list>
            </section>

            <ion-note
                v-if="errorFor('nextDue')"
                class="interval-error"
                color="danger"
            >
                {{ errorFor("nextDue") }}
            </ion-note>

            <details class="warning-settings">
                <summary>Due soon warning</summary>
                <div class="warning-settings__body">
                    <p class="section-description">
                        Leave these blank to use the CarLog defaults of 500
                        miles and 14 days. Enter 0 to wait until the exact due
                        mileage or date.
                    </p>
                    <ion-list
                        v-if="hasMileageDue || hasDateDue"
                        class="form-group"
                        lines="full"
                    >
                        <ion-item v-if="hasMileageDue">
                            <ion-input
                                v-model="formData.reminderLeadMileage"
                                data-field-path="reminderLeadMileage"
                                label="Mileage warning"
                                label-placement="stacked"
                                placeholder="Default: 500"
                                type="number"
                                inputmode="numeric"
                                min="0"
                                step="1"
                            >
                                <span slot="end">mi before</span>
                            </ion-input>
                        </ion-item>
                        <ion-note
                            v-if="errorFor('reminderLeadMileage')"
                            class="field-error"
                            color="danger"
                        >
                            {{ errorFor("reminderLeadMileage") }}
                        </ion-note>
                        <ion-item v-if="hasDateDue">
                            <ion-input
                                v-model="formData.reminderLeadDays"
                                data-field-path="reminderLeadDays"
                                label="Date warning"
                                label-placement="stacked"
                                placeholder="Default: 14"
                                type="number"
                                inputmode="numeric"
                                min="0"
                                step="1"
                            >
                                <span slot="end">days before</span>
                            </ion-input>
                        </ion-item>
                        <ion-note
                            v-if="errorFor('reminderLeadDays')"
                            class="field-error"
                            color="danger"
                        >
                            {{ errorFor("reminderLeadDays") }}
                        </ion-note>
                    </ion-list>
                    <ion-note v-else>
                        Add a next due mileage or date before changing its
                        warning.
                    </ion-note>
                </div>
            </details>
        </form>
    </ion-content>
</template>

<style scoped>
.schedule-form {
    width: min(100%, 40rem);
    margin: 0 auto;
    padding: 1rem var(--cl-page-gutter) 2rem;
}

.schedule-form section + section {
    margin-top: 1.5rem;
}

.schedule-form h2 {
    margin: 0 0 0.625rem;
    font-size: 1.125rem;
}

.section-description {
    margin: 0 0 0.75rem;
    color: var(--cl-text-muted);
    font-size: 0.875rem;
    line-height: 1.4;
}

.form-group {
    overflow: hidden;
    margin: 0;
    padding: 0;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
}

.validation-summary,
.field-error,
.interval-error {
    display: block;
    padding: 0.625rem 1rem;
}

.validation-summary {
    margin-bottom: 1rem;
    border: 1px solid var(--cl-danger);
    border-radius: var(--cl-card-radius);
    background: var(--cl-danger-soft);
}

.field-error {
    border-bottom: 1px solid var(--cl-border);
    background: var(--cl-danger-soft);
}

.interval-error {
    margin-top: 1rem;
    border-radius: var(--cl-card-radius);
    background: var(--cl-danger-soft);
}

.warning-settings {
    overflow: hidden;
    margin-top: 1.5rem;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
}

.warning-settings summary {
    padding: 1rem;
    color: var(--cl-text);
    font-size: 1rem;
    font-weight: 650;
    cursor: pointer;
}

.warning-settings__body {
    padding: 0 1rem 1rem;
}

.warning-settings__body .form-group {
    border-radius: 0.75rem;
}
</style>
