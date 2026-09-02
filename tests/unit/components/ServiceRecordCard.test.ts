import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ServiceRecordCard from "@/components/ServiceRecordCard.vue";
import type { ServiceRecord } from "@/types";

const passthrough = { template: "<div><slot /></div>" };
const global = {
    stubs: {
        IonCard: passthrough,
        IonCardHeader: passthrough,
        IonCardTitle: passthrough,
        IonCardSubtitle: passthrough,
        IonCardContent: passthrough,
        IonChip: { template: '<span class="chip"><slot /></span>' },
        IonIcon: true,
        IonList: passthrough,
        IonItem: passthrough,
        IonLabel: passthrough,
        IonButtons: passthrough,
        IonButton: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
    },
};

const record: ServiceRecord = {
    id: "record-1",
    vehicleId: "vehicle-1",
    date: "2026-08-31",
    mileage: 45_000,
    providerType: "SHOP",
    providerName: "Honest Auto",
    totalCostCents: 20_000,
    items: [
        {
            id: "oil",
            serviceRecordId: "record-1",
            serviceType: "OIL_CHANGE",
            oilType: "0W-20",
            filterReplaced: true,
        },
        {
            id: "repair",
            serviceRecordId: "record-1",
            serviceType: "REPAIR",
            title: "Serpentine belt",
            notes: "Replaced cracked belt",
        },
        {
            id: "other",
            serviceRecordId: "record-1",
            serviceType: "OTHER",
            title: "Differential fluid",
        },
    ],
};

describe("ServiceRecordCard", () => {
    it("renders one record card with a chip for every item", () => {
        const wrapper = mount(ServiceRecordCard, {
            props: { record },
            global,
        });

        expect(wrapper.findAll(".service-record-card")).toHaveLength(1);
        expect(wrapper.findAll(".chip").map((chip) => chip.text())).toEqual([
            "Oil change",
            "Repair",
            "Other",
        ]);
        expect(wrapper.text()).toContain("45,000 mi");
        expect(wrapper.text()).toContain("Honest Auto");
        expect(wrapper.text()).toContain("$200.00");
    });

    it("shows every item detail and emits edit and delete actions", async () => {
        const wrapper = mount(ServiceRecordCard, {
            props: { record },
            global,
        });
        const buttons = wrapper.findAll("button");

        await buttons
            .find((button) => button.text() === "View details")
            ?.trigger("click");
        expect(wrapper.text()).toContain("0W-20");
        expect(wrapper.text()).toContain("Serpentine belt");
        expect(wrapper.text()).toContain("Differential fluid");

        await buttons
            .find((button) => button.text() === "Edit")
            ?.trigger("click");
        await buttons
            .find((button) => button.text() === "Delete")
            ?.trigger("click");
        expect(wrapper.emitted("edit")?.[0]).toEqual([record]);
        expect(wrapper.emitted("delete")?.[0]).toEqual([record]);
    });
});
