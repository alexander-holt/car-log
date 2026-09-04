<script setup lang="ts">
defineProps<{
    licensePlate: string;
    accessibleLabel?: string;
}>();
</script>

<template>
    <span class="license-plate-badge" :aria-label="accessibleLabel">
        <span :aria-hidden="accessibleLabel ? 'true' : undefined">
            {{ licensePlate }}
        </span>
    </span>
</template>

<style scoped>
.license-plate-badge {
    display: inline-grid;
    width: 4.25rem;
    height: 2.5rem;
    min-width: 4.25rem;
    place-items: center;
    padding-inline: 0.375rem;
    overflow: hidden;
    border: 1.5px solid var(--cl-accent);
    border-radius: 0.375rem;
    background: var(--cl-accent-soft);
    color: var(--cl-accent);
    font-family: var(--cl-license-plate-font-family);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    font-weight: 750;
    letter-spacing: var(--cl-license-plate-letter-spacing);
    line-height: 1;
    text-transform: uppercase;
}

.license-plate-badge span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
