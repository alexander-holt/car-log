<script setup lang="ts">
import { IonButton, IonChip, IonLabel } from "@ionic/vue";
import { computed } from "vue";
import {
    getMaintenanceDueState,
    scheduleName,
} from "@/services/maintenanceScheduleService";
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

const dueDetails = computed(() => {
    const details: string[] = [];
    if (props.schedule.nextDueMileage !== undefined) {
        details.push(`${props.schedule.nextDueMileage.toLocaleString()} mi`);
    }
    if (props.schedule.nextDueDate) {
        details.push(formatLocalDate(props.schedule.nextDueDate));
    }
    return details.join(" · ");
});

const needsMileage = computed(
    () =>
        props.schedule.nextDueMileage !== undefined &&
        props.currentMileage === undefined,
);
</script>

<template>
    <article
        class="schedule-card"
        :class="{ 'schedule-card--disabled': !schedule.enabled }"
    >
        <div class="schedule-card__body">
            <div class="schedule-card__heading">
                <h3>{{ scheduleName(schedule) }}</h3>
                <ion-chip :class="`due-state due-state--${dueStateClass}`">
                    <ion-label>{{ dueStateLabel }}</ion-label>
                </ion-chip>
            </div>
            <p>{{ dueDetails }}</p>
            <p v-if="needsMileage" class="schedule-card__note">
                Add mileage to calculate mileage status.
            </p>
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

.schedule-card h3,
.schedule-card p {
    margin: 0;
}

.schedule-card h3 {
    font-size: 1.05rem;
}

.schedule-card p {
    margin-top: 0.375rem;
    color: var(--cl-text-muted);
}

.schedule-card .schedule-card__note {
    font-size: 0.8125rem;
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
