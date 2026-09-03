import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ServiceRecordCard from "@/components/ServiceRecordCard.vue";
import type { ServiceRecord } from "@/types";

const global = {
    stubs: {
        IonIcon: {
            props: ["icon"],
            template: '<span class="icon" aria-hidden="true" />',
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
    notes: "A long record note belongs on the detail screen.",
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
    it("renders one compact record card with a chip for every category", () => {
        const wrapper = mount(ServiceRecordCard, {
            props: { record },
            global,
        });

        expect(wrapper.findAll(".service-record-card")).toHaveLength(1);
        expect(
            wrapper.findAll(".service-chip").map((chip) => chip.text().trim()),
        ).toEqual(["Oil change", "Repair", "Other"]);
        expect(wrapper.text()).toContain("45,000 mi");
        expect(wrapper.text()).toContain("Shop · Honest Auto");
        expect(wrapper.text()).toContain("$200.00");
        expect(wrapper.find(".record-note-preview").text()).toContain(
            record.notes,
        );
    });

    it("combines duplicate categories into one chip with a count", () => {
        const wrapper = mount(ServiceRecordCard, {
            props: {
                record: {
                    ...record,
                    items: [
                        ...record.items,
                        {
                            id: "other-2",
                            serviceRecordId: "record-1",
                            serviceType: "OTHER",
                            title: "Washer fluid",
                        },
                        {
                            id: "oil-2",
                            serviceRecordId: "record-1",
                            serviceType: "OIL_CHANGE",
                            title: "Second oil service",
                            filterReplaced: false,
                        },
                    ],
                },
            },
            global,
        });

        expect(
            wrapper.findAll(".service-chip").map((chip) => chip.text().trim()),
        ).toEqual(["Oil change 2", "Repair", "Other 2"]);
        expect(wrapper.findAll(".service-chip")).toHaveLength(3);
        expect(
            wrapper.find('[aria-label="Oil change, 2 services"]').exists(),
        ).toBe(true);
        expect(wrapper.find('[aria-label="Other, 2 services"]').exists()).toBe(
            true,
        );
    });

    it("opens the full record without duplicating item details on the card", async () => {
        const wrapper = mount(ServiceRecordCard, {
            props: { record },
            global,
        });

        expect(wrapper.text()).not.toContain("0W-20");
        expect(wrapper.text()).not.toContain("Serpentine belt");
        expect(wrapper.text()).not.toContain("Differential fluid");

        await wrapper.get(".record-card-button").trigger("click");

        expect(wrapper.emitted("open")?.[0]).toEqual([record]);
        expect(
            wrapper.get(".record-card-button").attributes("aria-label"),
        ).toMatch(/Open service record/);
    });

    it("renders DIY records without a dangling provider separator", () => {
        const wrapper = mount(ServiceRecordCard, {
            props: {
                record: {
                    ...record,
                    providerType: "DIY",
                    providerName: undefined,
                },
            },
            global,
        });

        expect(wrapper.find(".record-visit").text()).toContain("DIY");
        expect(wrapper.find(".record-visit").text()).not.toContain("DIY ·");
    });
});
