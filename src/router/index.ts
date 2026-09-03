import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import HomePage from "../views/HomePage.vue";

const routes: Array<RouteRecordRaw> = [
    {
        path: "/",
        redirect: "/home",
    },
    {
        path: "/home",
        name: "Home",
        component: HomePage,
    },
    {
        path: "/vehicle/:id",
        name: "VehicleSummary",
        component: () => import("@/views/VehicleSummary.vue"),
    },
    {
        path: "/vehicle/:vehicleId/service-record/:recordId",
        name: "ServiceRecordDetail",
        component: () => import("@/views/ServiceRecordDetail.vue"),
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

export default router;
