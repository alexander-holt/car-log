<script setup lang="ts">
import { IonButton, IonChip, IonIcon, IonLabel } from "@ionic/vue";
import { computed } from "vue";
import {
    daysUntilLocalDate,
    getMaintenanceDueState,
    scheduleName,
} from "@/services/maintenanceScheduleService";
import { presentationFor } from "@/services/serviceRecordPresentation";
import { formatLocalDate } from "@/services/serviceRecordValidation";
import type { MaintenanceDueState, MaintenanceSchedule } from "@/types";

const props = defineProps<{
    schedule: MaintenanceSchedule;
    currentMileage?: number;
    today: string;
}>();

defineEmits<{
    log: [schedule: MaintenanceSchedule];
    edit: [schedule: MaintenanceSchedule];
    more: [schedule: MaintenanceSchedule];
}>();

const dueState = computed(() =>
    getMaintenanceDueState(props.schedule, props.currentMileage, props.today),
);
const servicePresentation = computed(() =>
    presentationFor(props.schedule.serviceType),
);

const dueStateLabel = computed(() => {
    if (!props.schedule.enabled) {
        return "Disabled";
    }
    const labels: Record<MaintenanceDueState, string> = {
        UPCOMING: "Upcoming",
        DUE_SOON: "Due soon",
        OVERDUE: "Overdue",
    };
    return labels[dueState.value];
});

const dueStateClass = computed(() =>
    props.schedule.enabled
        ? dueState.value.toLowerCase().replace("_", "-")
        : "disabled",
);

function formatCount(value: number, singular: string, plural: string): string {
    return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

const mileageCountdown = computed(() => {
    if (
        props.schedule.nextDueMileage === undefined ||
        props.currentMileage === undefined
    ) {
        return "Mileage needed";
    }

    const remaining = props.schedule.nextDueMileage - props.currentMileage;
    if (remaining > 0) {
        return `in ${formatCount(remaining, "mi", "mi")}`;
    }
    if (remaining === 0) {
        return "due now";
    }
    return `${formatCount(Math.abs(remaining), "mi", "mi")} overdue`;
});

const dateCountdown = computed(() => {
    if (!props.schedule.nextDueDate) {
        return "";
    }

    const remaining = daysUntilLocalDate(
        props.schedule.nextDueDate,
        props.today,
    );
    if (remaining > 0) {
        return `in ${formatCount(remaining, "day", "days")}`;
    }
    if (remaining === 0) {
        return "today";
    }
    return `${formatCount(Math.abs(remaining), "day", "days")} overdue`;
});
</script>

<template>
    <article
        class="schedule-card"
        :class="[
            `service-tone--${servicePresentation.tone}`,
            { 'schedule-card--disabled': !schedule.enabled },
        ]"
    >
        <div class="schedule-card__body">
            <div class="schedule-card__heading">
                <div class="schedule-card__identity">
                    <span class="schedule-card__type-icon" aria-hidden="true">
                        <ion-icon :icon="servicePresentation.icon" />
                    </span>
                    <h3>{{ scheduleName(schedule) }}</h3>
                </div>
                <ion-chip :class="`due-state due-state--${dueStateClass}`">
                    <ion-label>{{ dueStateLabel }}</ion-label>
                </ion-chip>
            </div>
            <div class="schedule-card__due-details">
                <div
                    v-if="schedule.nextDueMileage !== undefined"
                    class="schedule-card__due-row"
                    :aria-label="`Due at ${schedule.nextDueMileage.toLocaleString()} miles, ${mileageCountdown}`"
                >
                    <span class="schedule-card__target" aria-hidden="true">
                        @ {{ schedule.nextDueMileage.toLocaleString() }} mi
                    </span>
                    <span class="schedule-card__countdown" aria-hidden="true">
                        {{ mileageCountdown }}
                    </span>
                </div>
                <div
                    v-if="schedule.nextDueDate"
                    class="schedule-card__due-row"
                    :aria-label="`Due on ${formatLocalDate(schedule.nextDueDate)}, ${dateCountdown}`"
                >
                    <span class="schedule-card__target" aria-hidden="true">
                        on {{ formatLocalDate(schedule.nextDueDate) }}
                    </span>
                    <span class="schedule-card__countdown" aria-hidden="true">
                        {{ dateCountdown }}
                    </span>
                </div>
            </div>
        </div>
        <footer class="schedule-card__actions">
            <ion-button
                v-if="schedule.enabled"
                fill="clear"
                size="small"
                @click="$emit('log', schedule)"
            >
                Log service
            </ion-button>
            <ion-button
                fill="clear"
                size="small"
                @click="$emit('edit', schedule)"
            >
                Edit
            </ion-button>
            <ion-button
                fill="clear"
                size="small"
                :aria-label="`More actions for ${scheduleName(schedule)}`"
                @click="$emit('more', schedule)"
            >
                More
            </ion-button>
        </footer>
    </article>
</template>

<style scoped>
.schedule-card {
    overflow: hidden;
    border: 1px solid var(--cl-border);
    border-inline-start: 0.25rem solid var(--cl-service-tone);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.schedule-card--disabled {
    opacity: 0.72;
}

.schedule-card__body {
    padding: 1rem;
}

.schedule-card__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.schedule-card__identity {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.625rem;
}

.schedule-card h3 {
    margin: 0;
    font-size: 1.05rem;
}

.schedule-card__type-icon {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 0.625rem;
    background: var(--cl-service-tone-soft);
    color: var(--cl-service-tone);
}

.schedule-card__type-icon ion-icon {
    font-size: 1.125rem;
}

.schedule-card__due-details {
    display: grid;
    gap: 0.375rem;
    margin-top: 0.625rem;
}

.schedule-card__due-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    color: var(--cl-text-muted);
    font-size: 0.9375rem;
    font-variant-numeric: tabular-nums;
}

.schedule-card__countdown {
    color: var(--cl-text);
    font-weight: 600;
    text-align: end;
    white-space: nowrap;
}

.due-state {
    min-height: 1.75rem;
    margin: 0;
    font-size: 0.75rem;
    font-weight: 650;
}

.due-state--overdue {
    --background: var(--cl-danger-soft);
    --color: var(--cl-danger);
}

.due-state--due-soon {
    --background: var(--cl-warning-soft);
    --color: var(--cl-warning);
}

.schedule-card__actions {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--cl-border);
}
</style>
