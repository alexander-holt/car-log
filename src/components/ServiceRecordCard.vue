<script setup lang="ts">
import { IonIcon } from "@ionic/vue";
import { chevronForwardOutline } from "ionicons/icons";
import { computed } from "vue";
import { presentationFor } from "@/services/serviceRecordPresentation";
import {
    formatCost,
    formatLocalDate,
} from "@/services/serviceRecordValidation";
import type { ServiceRecord } from "@/types";

const props = defineProps<{
    record: ServiceRecord;
}>();

defineEmits<{
    open: [record: ServiceRecord];
}>();

const categoryCounts = computed(() => {
    const counts = new Map<
        ServiceRecord["items"][number]["serviceType"],
        number
    >();

    for (const item of props.record.items) {
        counts.set(item.serviceType, (counts.get(item.serviceType) ?? 0) + 1);
    }

    return [...counts].map(([serviceType, count]) => ({
        serviceType,
        count,
    }));
});

function providerLabel(): string {
    const providerType = props.record.providerType === "DIY" ? "DIY" : "Shop";
    return props.record.providerName
        ? `${providerType} · ${props.record.providerName}`
        : providerType;
}

function recordAriaLabel(): string {
    return `Open service record from ${formatLocalDate(props.record.date)}`;
}
</script>

<template>
    <article class="service-record-card">
        <button
            class="record-card-button"
            type="button"
            :aria-label="recordAriaLabel()"
            @click="$emit('open', record)"
        >
            <div class="record-timing">
                <time :datetime="record.date">
                    {{ formatLocalDate(record.date) }}
                </time>
                <span>{{ record.mileage.toLocaleString() }} mi</span>
            </div>

            <div class="record-visit">
                <span>{{ providerLabel() }}</span>
                <span
                    v-if="record.totalCostCents !== undefined"
                    class="record-cost"
                >
                    {{ formatCost(record.totalCostCents) }}
                </span>
            </div>

            <div class="category-chips" aria-label="Service categories">
                <span
                    v-for="category in categoryCounts"
                    :key="category.serviceType"
                    class="service-chip"
                    :class="`service-tone--${presentationFor(category.serviceType).tone}`"
                    :aria-label="
                        category.count > 1
                            ? `${presentationFor(category.serviceType).label}, ${category.count} services`
                            : undefined
                    "
                >
                    <ion-icon
                        aria-hidden="true"
                        :icon="presentationFor(category.serviceType).icon"
                    />
                    {{ presentationFor(category.serviceType).label }}
                    <span
                        v-if="category.count > 1"
                        class="service-chip-count"
                        aria-hidden="true"
                    >
                        {{ category.count }}
                    </span>
                </span>
            </div>

            <div v-if="record.notes" class="record-note-preview">
                <p>{{ record.notes }}</p>
                <ion-icon aria-hidden="true" :icon="chevronForwardOutline" />
            </div>
            <ion-icon
                v-else
                class="record-disclosure"
                aria-hidden="true"
                :icon="chevronForwardOutline"
            />
        </button>
    </article>
</template>

<style scoped>
.service-record-card {
    margin: 0 0 1rem;
}

.record-card-button {
    position: relative;
    width: 100%;
    padding: 1rem;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
    color: var(--cl-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.record-card-button:focus-visible {
    outline: 3px solid var(--cl-accent);
    outline-offset: 2px;
}

.record-card-button:active {
    background: var(--cl-surface-muted);
}

.record-timing,
.record-visit {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    font-variant-numeric: tabular-nums;
}

.record-timing {
    font-size: 0.9375rem;
    font-weight: 650;
    letter-spacing: -0.01em;
}

.record-timing span {
    color: var(--cl-text);
    font-weight: inherit;
    white-space: nowrap;
}

.record-visit {
    margin-top: 0.375rem;
    color: var(--cl-text-muted);
    font-size: 0.9375rem;
}

.record-cost {
    color: var(--cl-text);
    font-weight: 500;
    white-space: nowrap;
}

.category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-block: 0.875rem;
}

.service-chip {
    display: inline-flex;
    min-height: 1.75rem;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    background: var(--cl-service-tone-soft);
    color: var(--cl-service-tone);
    font-size: 0.8125rem;
    font-weight: 650;
    line-height: 1.2;
}

.service-chip ion-icon {
    flex: 0 0 auto;
    font-size: 1rem;
}

.service-chip-count {
    display: inline-grid;
    min-width: 1.125rem;
    height: 1.125rem;
    place-items: center;
    padding-inline: 0.25rem;
    border-radius: 999px;
    background: var(--cl-service-tone);
    color: var(--cl-service-tone-soft);
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    font-weight: 750;
    line-height: 1;
}

.record-note-preview {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.875rem;
    border-top: 1px solid var(--cl-border);
    color: var(--cl-text-muted);
}

.record-note-preview p {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    font-size: 0.9375rem;
    line-height: 1.4;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.record-note-preview ion-icon,
.record-disclosure {
    color: var(--cl-text-muted);
    font-size: 1.125rem;
}

.record-disclosure {
    position: absolute;
    right: 1rem;
    bottom: 1.25rem;
}

@media (hover: hover) {
    .record-card-button:hover {
        border-color: var(--cl-accent);
    }
}
</style>
