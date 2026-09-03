import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import App from "@/App.vue";
import { bootstrapError, setBootstrapError } from "@/services/bootstrapState";

const global = {
    stubs: {
        IonApp: { template: "<div><slot /></div>" },
        IonPage: { template: "<div><slot /></div>" },
        IonContent: { template: "<div><slot /></div>" },
        IonRouterOutlet: { template: '<div data-testid="router-outlet" />' },
    },
};

describe("App startup state", () => {
    afterEach(() => {
        bootstrapError.value = null;
    });

    it("shows a visible error when application startup fails", () => {
        setBootstrapError(new Error("Database migration failed"));

        const wrapper = mount(App, { global });

        expect(wrapper.get('[role="alert"]').text()).toContain(
            "Database migration failed",
        );
        expect(wrapper.find('[data-testid="router-outlet"]').exists()).toBe(
            false,
        );
    });

    it("shows the router when startup succeeds", () => {
        const wrapper = mount(App, { global });

        expect(wrapper.find('[data-testid="router-outlet"]').exists()).toBe(
            true,
        );
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });
});
