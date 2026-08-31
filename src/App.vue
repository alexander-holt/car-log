<script setup lang="ts">
import { bootstrapError } from "@/services/bootstrapState";
import { IonApp, IonContent, IonPage, IonRouterOutlet } from "@ionic/vue";
</script>

<template>
    <ion-app>
        <ion-page v-if="bootstrapError">
            <ion-content class="ion-padding">
                <main class="startup-error" role="alert">
                    <h1>CarLog couldn't start</h1>
                    <p>
                        CarLog could not open its local database. Your data was
                        not reset or deleted.
                    </p>
                    <p class="startup-error__detail">{{ bootstrapError }}</p>
                    <p>
                        Close and reopen the app. If this continues, report the
                        error above.
                    </p>
                </main>
            </ion-content>
        </ion-page>
        <ion-router-outlet v-else />
    </ion-app>
</template>

<style scoped>
.startup-error {
    max-width: 36rem;
    margin: 20vh auto 0;
}

.startup-error__detail {
    padding: 1rem;
    border-radius: 0.5rem;
    background: var(--ion-color-light);
    color: var(--ion-color-light-contrast);
    overflow-wrap: anywhere;
}
</style>
