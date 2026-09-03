function setIonInput(selector: string, value: string): void {
    cy.get(selector).find("input").clear().type(value);
}

describe("Phase 3 maintenance schedules", () => {
    it("creates, edits, disables, completes, and deletes a schedule", () => {
        const vehicleModel = `Phase Three Runner ${Date.now()}`;

        cy.visit("/");
        cy.get("ion-fab-button").click();
        setIonInput('[data-field-path="make"]', "Test");
        setIonInput('[data-field-path="model"]', vehicleModel);
        setIonInput('[data-field-path="currentMileage"]', "45000");
        cy.get("ion-modal").contains("ion-button", "Save").click();

        cy.contains(".vehicle-name", vehicleModel).closest("ion-item").click();
        cy.contains("h2", "Upcoming maintenance").should("be.visible");
        cy.contains("ion-button", "Add schedule").click();

        setIonInput('[data-field-path="intervalMileage"]', "5000");
        setIonInput('[data-field-path="nextDueMileage"]', "50000");
        setIonInput('[data-field-path="reminderLeadMileage"]', "500");
        cy.get("ion-modal").contains("ion-button", "Save").click();

        cy.contains(".schedule-card", "Oil change").within(() => {
            cy.contains("Upcoming").should("exist");
            cy.contains("50,000 mi").should("exist");
            cy.contains("ion-button", "Edit").click();
        });
        setIonInput('[data-field-path="nextDueMileage"]', "51000");
        cy.get("ion-modal").contains("ion-button", "Save").click();
        cy.contains(".schedule-card", "51,000 mi").should("exist");

        cy.contains(".schedule-card", "Oil change")
            .contains("ion-button", "More")
            .click();
        cy.get("ion-action-sheet")
            .contains("button", "Disable schedule")
            .click();
        cy.contains(".schedule-card", "Disabled").should("exist");

        cy.contains(".schedule-card", "Oil change")
            .contains("ion-button", "More")
            .click();
        cy.get("ion-action-sheet")
            .contains("button", "Enable schedule")
            .click();

        cy.get(".mileage-link").click();
        setIonInput('[data-field-path="currentMileage"]', "50500");
        cy.get("ion-modal").contains("ion-button", "Save").click();
        cy.get(".mileage-link").should("contain.text", "50,500 mi");
        cy.contains(".schedule-card", "Oil change")
            .contains("Due soon")
            .should("exist");

        cy.visit("/home");
        cy.contains(".vehicle-name", vehicleModel)
            .closest("ion-item")
            .within(() => {
                cy.contains("Due soon: Oil change").should("exist");
            });
        cy.contains(".vehicle-name", vehicleModel).closest("ion-item").click();

        cy.contains(".schedule-card", "Oil change")
            .contains("ion-button", "Log service")
            .click();
        cy.get("ion-modal").contains("ion-title", "Add record").should("exist");
        cy.get("ion-modal").contains("ion-button", "Save").click();

        cy.contains(".schedule-card", "55,500 mi").should("exist");
        cy.contains("h2", "Service history")
            .parent()
            .contains("Oil change")
            .should("exist");

        cy.contains(".schedule-card", "Oil change")
            .contains("ion-button", "More")
            .click();
        cy.get("ion-action-sheet")
            .contains("button", "Delete schedule")
            .click();
        cy.get("ion-alert").contains("button", "Delete").click();

        cy.contains(".schedule-card", "Oil change").should("not.exist");
        cy.contains("h2", "Service history")
            .parent()
            .contains("Oil change")
            .should("exist");
    });
});
