import { createApp } from "vue";
import { createPinia } from "pinia";
import { databaseService } from "./services/databaseService";
import { useVehicleStore } from "./store/vehicleStore";
import App from "./App.vue";
import router from "./router";

import { IonicVue } from "@ionic/vue";
import { Capacitor } from "@capacitor/core";
import { defineCustomElements as jeepSqlite } from "jeep-sqlite/loader";

/* Core CSS required for Ionic components to work properly */
import "@ionic/vue/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import "@ionic/vue/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

const pinia = createPinia();
const app = createApp(App).use(IonicVue).use(router).use(pinia);

async function bootstrap() {
    try {
        // Get platfrom
        const platform = Capacitor.getPlatform();
        if (platform === "web") {
            jeepSqlite(window);

            // inject into dom
            const jeepEl = document.createElement("jeep-sqlite");
            document.body.appendChild(jeepEl);

            // wait for definition
            await customElements.whenDefined("jeep-sqlite");
        }

        // Initialize DB
        await databaseService.initialize();

        // Initialize Pinia
        const vehicleStore = useVehicleStore(pinia);
        await vehicleStore.loadVehicles();
    } catch (error) {
        console.error("Critical boot error:", error);
    } finally {
        router.isReady().then(() => {
            app.mount("#app");
        });
    }
}

bootstrap();
