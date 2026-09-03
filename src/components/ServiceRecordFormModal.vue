<script setup lang="ts">
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
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
    toastController,
} from "@ionic/vue";
import {
    addOutline,
    alertCircleOutline,
    chevronDownOutline,
    chevronForwardOutline,
    trashOutline,
} from "ionicons/icons";
import { computed, nextTick, reactive, ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { presentationFor } from "@/services/serviceRecordPresentation";
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
const openItemId = ref<string | null>(
    isEditMode.value ? null : (formData.items[0]?.id ?? null),
);
const showValidationErrors = ref(false);
const formRef = ref<HTMLFormElement | null>(null);

const ISSUE_SCROLL_DURATION_MS = 180;
const ISSUE_SCROLL_MAX_TOP_OFFSET_PX = 96;
const VALIDATION_TOAST_ID = "service-record-validation";
let validationToast: HTMLIonToastElement | null = null;

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

function buildRecord(totalCostCents: number | undefined): ServiceRecord {
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
        totalCostCents,
        notes: normalizeOptionalText(formData.notes),
        items: formData.items.map(buildItem),
    };
}

const validationIssues = computed<ValidationIssue[]>(() => {
    const issues: ValidationIssue[] = [];
    let totalCostCents: number | undefined;

    try {
        totalCostCents = parseCostToCents(formData.cost);
    } catch (error) {
        issues.push({
            path: "totalCostCents",
            message:
                error instanceof Error ? error.message : "Enter a valid cost.",
        });
    }

    return [
        ...issues,
        ...validateServiceRecord(buildRecord(totalCostCents), today),
    ];
});

const isFormValid = computed(() => validationIssues.value.length === 0);
const invalidServiceCount = computed(
    () =>
        new Set(
            validationIssues.value
                .map((issue) => /^items\.(\d+)\./.exec(issue.path)?.[1])
                .filter((index): index is string => index !== undefined),
        ).size,
);

function errorFor(path: string): string | undefined {
    if (!showValidationErrors.value) {
        return undefined;
    }
    return validationIssues.value.find((issue) => issue.path === path)?.message;
}

function issueCountForItem(index: number): number {
    if (!showValidationErrors.value) {
        return 0;
    }
    const prefix = `items.${index}.`;
    return validationIssues.value.filter((issue) =>
        issue.path.startsWith(prefix),
    ).length;
}

function issueSummary(): string {
    const issueCount = validationIssues.value.length;
    const fieldWord = issueCount === 1 ? "field needs" : "fields need";
    const serviceCount = invalidServiceCount.value;

    if (serviceCount === 0) {
        return `${issueCount} ${fieldWord} attention.`;
    }

    const serviceWord = serviceCount === 1 ? "service" : "services";
    const serviceVerb = serviceCount === 1 ? "has" : "have";
    return `${issueCount} ${fieldWord} attention. ${serviceCount} ${serviceWord} ${serviceVerb} errors.`;
}

function toggleItem(itemId: string): void {
    openItemId.value = openItemId.value === itemId ? null : itemId;
}

function addItem(): void {
    const item = newItem();
    formData.items.push(item);
    openItemId.value = item.id;
}

function removeItem(index: number): void {
    if (formData.items.length > 1) {
        const [removedItem] = formData.items.splice(index, 1);
        if (removedItem?.id === openItemId.value) {
            openItemId.value = null;
        }
    }
}

async function cancel(): Promise<void> {
    await dismissValidationToast();
    void modalController.dismiss(null, "cancel");
}

async function scrollToFirstIssue(): Promise<void> {
    const firstIssue = validationIssues.value[0];
    if (!firstIssue) {
        return;
    }

    const itemMatch = /^items\.(\d+)\./.exec(firstIssue.path);
    if (itemMatch) {
        const item = formData.items[Number(itemMatch[1])];
        openItemId.value = item?.id ?? null;
    }

    await nextTick();
    const field = formRef.value?.querySelector<HTMLElement>(
        `[data-field-path="${firstIssue.path}"]`,
    );
    if (!field) {
        return;
    }

    const content = field.closest<HTMLIonContentElement>("ion-content");
    if (!content?.getScrollElement || !content.scrollToPoint) {
        field.scrollIntoView({ behavior: "auto", block: "center" });
        return;
    }

    const scrollElement = await content.getScrollElement();
    const scrollBounds = scrollElement.getBoundingClientRect();
    const fieldBounds = field.getBoundingClientRect();
    const topOffset = Math.min(
        ISSUE_SCROLL_MAX_TOP_OFFSET_PX,
        scrollBounds.height * 0.18,
    );
    const destination = Math.max(
        0,
        scrollElement.scrollTop +
            fieldBounds.top -
            scrollBounds.top -
            topOffset,
    );

    await content.scrollToPoint(
        undefined,
        destination,
        ISSUE_SCROLL_DURATION_MS,
    );
}

async function showValidationFailureToast(): Promise<void> {
    await dismissValidationToast();
    const toast = await toastController.create({
        id: VALIDATION_TOAST_ID,
        message: `Record not saved. ${issueSummary()}`,
        color: "danger",
        duration: 2800,
        position: "bottom",
    });
    validationToast = toast;
    await toast.present();
}

async function dismissValidationToast(): Promise<void> {
    if (!validationToast) {
        return;
    }

    const toast = validationToast;
    validationToast = null;
    await toast.dismiss();
}

async function saveRecord(): Promise<void> {
    showValidationErrors.value = true;
    if (!isFormValid.value) {
        const toastPromise = showValidationFailureToast();
        await scrollToFirstIssue();
        await toastPromise;
        return;
    }
    await dismissValidationToast();
    void modalController.dismiss(
        buildRecord(parseCostToCents(formData.cost)),
        "confirm",
    );
}
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-buttons slot="start">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
            <ion-title>
                {{ isEditMode ? "Edit record" : "Add record" }}
            </ion-title>
            <ion-buttons slot="end">
                <ion-button class="save-button" @click="saveRecord">
                    Save
                </ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-content>
        <form
            ref="formRef"
            class="cl-form service-record-form"
            @submit.prevent="saveRecord"
        >
            <div
                v-if="showValidationErrors && !isFormValid"
                class="validation-summary"
                role="alert"
            >
                <ion-icon aria-hidden="true" :icon="alertCircleOutline" />
                <span>{{ issueSummary() }}</span>
            </div>

            <section
                class="form-section"
                aria-labelledby="record-details-title"
            >
                <h2 id="record-details-title">Record details</h2>
                <ion-list class="form-group" lines="full">
                    <ion-item>
                        <ion-input
                            v-model="formData.date"
                            data-field-path="date"
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
                            data-field-path="mileage"
                            label="Mileage *"
                            label-placement="stacked"
                            placeholder="e.g. 120000"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            step="1"
                            required
                        >
                            <span slot="end" class="field-affix">mi</span>
                        </ion-input>
                    </ion-item>
                    <ion-note
                        v-if="errorFor('mileage')"
                        color="danger"
                        class="field-error"
                    >
                        {{ errorFor("mileage") }}
                    </ion-note>

                    <div class="provider-field" data-field-path="providerType">
                        <ion-label id="provider-label">Provider *</ion-label>
                        <ion-segment
                            v-model="formData.providerType"
                            aria-labelledby="provider-label"
                        >
                            <ion-segment-button value="DIY">
                                <ion-label>DIY</ion-label>
                            </ion-segment-button>
                            <ion-segment-button value="SHOP">
                                <ion-label>Shop</ion-label>
                            </ion-segment-button>
                        </ion-segment>
                    </div>

                    <ion-item>
                        <ion-input
                            v-model="formData.providerName"
                            :label="
                                formData.providerType === 'SHOP'
                                    ? 'Shop name'
                                    : 'Person name'
                            "
                            label-placement="stacked"
                            placeholder="Optional"
                            :maxlength="120"
                        />
                    </ion-item>

                    <ion-item>
                        <ion-input
                            v-model="formData.cost"
                            data-field-path="totalCostCents"
                            label="Total cost"
                            label-placement="stacked"
                            placeholder="0.00"
                            type="number"
                            inputmode="decimal"
                            min="0"
                            step="0.01"
                        >
                            <span slot="start" class="field-affix">$</span>
                        </ion-input>
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
                            label="Record notes"
                            label-placement="stacked"
                            placeholder="Work performed, parts, or follow-up notes"
                            :rows="3"
                            :maxlength="2000"
                        />
                    </ion-item>
                </ion-list>
            </section>

            <section
                class="form-section items-section"
                aria-labelledby="service-items-title"
            >
                <h2 id="service-items-title">Services</h2>

                <article
                    v-for="(item, index) in formData.items"
                    :key="item.id"
                    class="service-item-card"
                >
                    <button
                        class="service-item-summary"
                        type="button"
                        :aria-expanded="openItemId === item.id"
                        :aria-controls="`service-item-panel-${item.id}`"
                        @click="toggleItem(item.id)"
                    >
                        <span
                            class="service-item-icon"
                            :class="`service-tone--${presentationFor(item.serviceType).tone}`"
                        >
                            <ion-icon
                                aria-hidden="true"
                                :icon="presentationFor(item.serviceType).icon"
                            />
                        </span>
                        <span class="service-item-name">
                            <strong>
                                {{ presentationFor(item.serviceType).label }}
                            </strong>
                            <span v-if="item.title">{{ item.title }}</span>
                        </span>
                        <span
                            v-if="issueCountForItem(index) > 0"
                            class="item-issue-count"
                        >
                            <ion-icon
                                aria-hidden="true"
                                :icon="alertCircleOutline"
                            />
                            {{ issueCountForItem(index) }}
                            {{
                                issueCountForItem(index) === 1
                                    ? "issue"
                                    : "issues"
                            }}
                        </span>
                        <ion-icon
                            class="service-item-chevron"
                            aria-hidden="true"
                            :icon="
                                openItemId === item.id
                                    ? chevronDownOutline
                                    : chevronForwardOutline
                            "
                        />
                    </button>

                    <div
                        v-if="openItemId === item.id"
                        :id="`service-item-panel-${item.id}`"
                        class="service-item-panel"
                    >
                        <ion-list lines="full">
                            <ion-item>
                                <ion-select
                                    v-model="item.serviceType"
                                    :data-field-path="`items.${index}.serviceType`"
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

                            <ion-item>
                                <ion-input
                                    v-model="item.title"
                                    :data-field-path="`items.${index}.title`"
                                    :label="
                                        item.serviceType === 'OTHER'
                                            ? 'Title *'
                                            : 'Title'
                                    "
                                    label-placement="stacked"
                                    :placeholder="
                                        item.serviceType === 'OTHER'
                                            ? 'Describe this service'
                                            : 'Optional service title'
                                    "
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
                                        :data-field-path="`items.${index}.oilType`"
                                        label="Oil type"
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
                                        :data-field-path="`items.${index}.treadDepthRemaining`"
                                        label="Tread depth"
                                        label-placement="stacked"
                                        placeholder="e.g. 8"
                                        type="number"
                                        inputmode="decimal"
                                        min="0"
                                        max="32"
                                        step="0.1"
                                    >
                                        <span slot="end" class="field-affix">
                                            /32 in
                                        </span>
                                    </ion-input>
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
                                    label="Notes"
                                    label-placement="stacked"
                                    placeholder="Parts, results, or follow-up notes"
                                    :rows="2"
                                    :maxlength="1000"
                                />
                            </ion-item>
                        </ion-list>

                        <footer
                            v-if="formData.items.length > 1"
                            class="service-item-footer"
                        >
                            <ion-button
                                class="remove-item-button"
                                fill="clear"
                                color="danger"
                                :aria-label="`Remove ${presentationFor(item.serviceType).label.toLowerCase()}`"
                                @click="removeItem(index)"
                            >
                                <ion-icon
                                    slot="icon-only"
                                    :icon="trashOutline"
                                />
                            </ion-button>
                        </footer>
                    </div>
                </article>

                <ion-note
                    v-if="errorFor('items')"
                    color="danger"
                    class="field-error"
                >
                    {{ errorFor("items") }}
                </ion-note>
                <ion-button
                    class="add-item-button"
                    fill="clear"
                    @click="addItem"
                >
                    <ion-icon slot="start" :icon="addOutline" />
                    Add another service
                </ion-button>
            </section>
        </form>
    </ion-content>
</template>

<style scoped>
.service-record-form {
    width: min(100%, 46rem);
    margin: 0 auto;
    padding: 1rem var(--cl-page-gutter) 2rem;
}

.validation-summary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cl-danger);
    border-radius: var(--cl-card-radius);
    background: var(--cl-danger-soft);
    color: var(--cl-danger);
    font-size: 0.9375rem;
    font-weight: 550;
}

.validation-summary ion-icon {
    font-size: 1.125rem;
}

.form-section > h2 {
    margin: 0 0 0.625rem;
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.form-group,
.service-item-panel ion-list {
    padding: 0;
    background: transparent;
}

.form-group {
    overflow: hidden;
    margin: 0;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.form-group ion-item,
.service-item-panel ion-item {
    --background: transparent;
    --border-color: var(--cl-border);
}

.provider-field {
    min-height: var(--cl-form-row-min-height);
    padding: 0.625rem var(--cl-form-padding-inline);
    border-bottom: 1px solid var(--cl-border);
}

.provider-field > ion-label {
    display: block;
    margin-bottom: 0.625rem;
    color: var(--cl-text-muted);
    font-size: var(--cl-form-label-size);
}

.provider-field ion-segment {
    --background: var(--cl-surface-muted);
}

.save-button {
    font-weight: 650;
}

.service-item-card {
    overflow: hidden;
    margin-bottom: 0.75rem;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.service-item-summary {
    display: grid;
    width: 100%;
    min-height: 4.75rem;
    grid-template-columns: 2.5rem minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 0;
    background: transparent;
    color: var(--cl-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.service-item-summary:focus-visible {
    outline: 3px solid var(--cl-accent);
    outline-offset: -3px;
}

.service-item-summary:active {
    background: var(--cl-surface-muted);
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

.service-item-name {
    display: grid;
    min-width: 0;
    gap: 0.125rem;
}

.service-item-name strong,
.service-item-name > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.service-item-name strong {
    font-size: 1rem;
    font-weight: 700;
}

.service-item-name > span {
    color: var(--cl-text-muted);
    font-size: 0.875rem;
}

.item-issue-count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--cl-danger);
    font-size: 0.75rem;
    font-weight: 650;
    white-space: nowrap;
}

.item-issue-count ion-icon {
    font-size: 1rem;
}

.service-item-chevron {
    color: var(--cl-text-muted);
    font-size: 1.125rem;
}

.service-item-panel {
    border-top: 1px solid var(--cl-border);
}

.service-item-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0.25rem 0.5rem;
    border-top: 1px solid var(--cl-border);
}

.remove-item-button {
    width: 2.75rem;
    height: 2.75rem;
    margin: 0;
    --padding-end: 0;
    --padding-start: 0;
}

.add-item-button {
    width: 100%;
    min-height: 3rem;
    margin: 0.25rem 0 0;
    --color: var(--cl-accent);
}

.field-error {
    display: block;
    margin: 0;
    padding-block: 0.5rem 0.625rem;
    border-bottom: 1px solid var(--cl-border);
    background: var(--cl-danger-soft);
    font-size: 0.8125rem;
}

@media (max-width: 390px) {
    .service-item-summary {
        grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    }

    .item-issue-count {
        grid-column: 2;
        grid-row: 2;
    }

    .service-item-chevron {
        grid-column: 3;
        grid-row: 1 / span 2;
    }
}
</style>
