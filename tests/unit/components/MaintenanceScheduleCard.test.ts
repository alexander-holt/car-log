import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MaintenanceScheduleCard from "@/components/MaintenanceScheduleCard.vue";
import type { MaintenanceSchedule } from "@/types";

const passthrough = { template: "<div><slot /></div>" };
const global = {
    stubs: {
        IonChip: passthrough,
        IonLabel: passthrough,
        IonButton: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
    },
};

const schedule: MaintenanceSchedule = {
    id: "schedule-1",
    vehicleId: "vehicle-1",
    serviceType: "OIL_CHANGE",
    intervalMileage: 5_000,
    intervalMonths: 6,
    nextDueMileage: 50_000,
    nextDueDate: "2027-03-03",
    reminderLeadMileage: 500,
    reminderLeadDays: 14,
    enabled: true,
};

describe("MaintenanceScheduleCard", () => {
    it("renders schedule details and the derived due state", () => {
        const wrapper = mount(MaintenanceScheduleCard, {
            props: {
                schedule,
                currentMileage: 49_500,
                today: "2026-09-03",
            },
            global,
        });

        expect(wrapper.get(".schedule-card").text()).toContain("Oil change");
        expect(wrapper.text()).toContain("50,000 mi · Mar 3, 2027");
        expect(wrapper.get(".due-state").text()).toBe("Due soon");
        expect(wrapper.get(".due-state").classes()).toContain(
            "due-state--due-soon",
        );
    });

    it("prompts for mileage when a mileage threshold cannot be calculated", () => {
        const wrapper = mount(MaintenanceScheduleCard, {
            props: { schedule, today: "2026-09-03" },
            global,
        });

        expect(wrapper.get(".schedule-card__note").text()).toBe(
            "Add mileage to calculate mileage status.",
        );
    });

    it("emits the schedule for each card action", async () => {
        const wrapper = mount(MaintenanceScheduleCard, {
            props: {
                schedule,
                currentMileage: 49_500,
                today: "2026-09-03",
            },
            global,
        });

        for (const action of ["Log service", "Edit", "More"]) {
            await wrapper
                .findAll("button")
                .find((button) => button.text() === action)
                ?.trigger("click");
        }

        expect(wrapper.emitted("log")?.[0]).toEqual([schedule]);
        expect(wrapper.emitted("edit")?.[0]).toEqual([schedule]);
        expect(wrapper.emitted("more")?.[0]).toEqual([schedule]);
    });

    it("marks disabled schedules and hides the log action", () => {
        const disabledSchedule = { ...schedule, enabled: false };
        const wrapper = mount(MaintenanceScheduleCard, {
            props: {
                schedule: disabledSchedule,
                currentMileage: 49_500,
                today: "2026-09-03",
            },
            global,
        });

        expect(wrapper.get(".schedule-card").classes()).toContain(
            "schedule-card--disabled",
        );
        expect(wrapper.get(".due-state").text()).toBe("Disabled");
        expect(wrapper.text()).not.toContain("Log service");
    });
});
