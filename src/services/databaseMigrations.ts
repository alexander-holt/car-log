import type { capSQLiteVersionUpgrade } from "@capacitor-community/sqlite";

export const DATABASE_VERSION = 1;

const serviceTypeConstraint = `
    CHECK (
        serviceType IN (
            'OIL_CHANGE',
            'TIRE_ROTATION',
            'TIRE_REPLACEMENT',
            'BRAKE_SERVICE',
            'BATTERY_SERVICE',
            'INSPECTION',
            'REPAIR',
            'OTHER'
        )
    )
`;

export const DATABASE_MIGRATIONS: capSQLiteVersionUpgrade[] = [
    {
        toVersion: DATABASE_VERSION,
        statements: [
            `
                CREATE TABLE vehicles (
                    id TEXT PRIMARY KEY NOT NULL,
                    make TEXT NOT NULL,
                    model TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    vin TEXT,
                    licensePlate TEXT,
                    engineType TEXT,
                    currentMileage INTEGER CHECK (
                        currentMileage IS NULL OR currentMileage >= 0
                    ),
                    mileageUpdatedAt TEXT,
                    mileageReminderIntervalDays INTEGER NOT NULL DEFAULT 30 CHECK (
                        mileageReminderIntervalDays > 0
                    ),
                    mileageRemindersEnabled INTEGER NOT NULL DEFAULT 1 CHECK (
                        mileageRemindersEnabled IN (0, 1)
                    ),
                    createdAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    updatedAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    )
                );
            `,
            `
                CREATE TABLE maintenance_schedules (
                    id TEXT PRIMARY KEY NOT NULL,
                    vehicleId TEXT NOT NULL,
                    serviceType TEXT NOT NULL ${serviceTypeConstraint},
                    label TEXT,
                    intervalMileage INTEGER CHECK (
                        intervalMileage IS NULL OR intervalMileage > 0
                    ),
                    intervalMonths INTEGER CHECK (
                        intervalMonths IS NULL OR intervalMonths > 0
                    ),
                    nextDueMileage INTEGER CHECK (
                        nextDueMileage IS NULL OR nextDueMileage >= 0
                    ),
                    nextDueDate TEXT,
                    reminderLeadMileage INTEGER CHECK (
                        reminderLeadMileage IS NULL OR reminderLeadMileage >= 0
                    ),
                    reminderLeadDays INTEGER CHECK (
                        reminderLeadDays IS NULL OR reminderLeadDays >= 0
                    ),
                    notificationId INTEGER,
                    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
                    lastCompletedServiceItemId TEXT,
                    createdAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    updatedAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    CHECK (
                        serviceType <> 'OTHER' OR (
                            label IS NOT NULL AND length(trim(label)) > 0
                        )
                    ),
                    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
                    FOREIGN KEY (lastCompletedServiceItemId)
                        REFERENCES service_items(id) ON DELETE SET NULL
                );
            `,
            `
                CREATE TABLE service_records (
                    id TEXT PRIMARY KEY NOT NULL,
                    vehicleId TEXT NOT NULL,
                    date TEXT NOT NULL,
                    mileage INTEGER NOT NULL CHECK (mileage >= 0),
                    providerType TEXT NOT NULL CHECK (
                        providerType IN ('DIY', 'SHOP')
                    ),
                    providerName TEXT,
                    totalCostCents INTEGER CHECK (
                        totalCostCents IS NULL OR totalCostCents >= 0
                    ),
                    notes TEXT,
                    createdAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    updatedAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
                );
            `,
            `
                CREATE TABLE service_items (
                    id TEXT PRIMARY KEY NOT NULL,
                    serviceRecordId TEXT NOT NULL,
                    serviceType TEXT NOT NULL ${serviceTypeConstraint},
                    title TEXT,
                    notes TEXT,
                    scheduleId TEXT,
                    createdAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    updatedAt TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    CHECK (
                        serviceType <> 'OTHER' OR (
                            title IS NOT NULL AND length(trim(title)) > 0
                        )
                    ),
                    FOREIGN KEY (serviceRecordId)
                        REFERENCES service_records(id) ON DELETE CASCADE,
                    FOREIGN KEY (scheduleId)
                        REFERENCES maintenance_schedules(id) ON DELETE SET NULL
                );
            `,
            `
                CREATE TABLE oil_change_details (
                    serviceItemId TEXT PRIMARY KEY NOT NULL,
                    oilType TEXT,
                    filterReplaced INTEGER CHECK (
                        filterReplaced IS NULL OR filterReplaced IN (0, 1)
                    ),
                    FOREIGN KEY (serviceItemId)
                        REFERENCES service_items(id) ON DELETE CASCADE
                );
            `,
            `
                CREATE TABLE tire_service_details (
                    serviceItemId TEXT PRIMARY KEY NOT NULL,
                    treadDepthRemaining REAL CHECK (
                        treadDepthRemaining IS NULL OR treadDepthRemaining >= 0
                    ),
                    FOREIGN KEY (serviceItemId)
                        REFERENCES service_items(id) ON DELETE CASCADE
                );
            `,
            `
                CREATE INDEX idx_service_records_vehicle_date
                ON service_records(vehicleId, date DESC);
            `,
            `
                CREATE INDEX idx_service_items_record
                ON service_items(serviceRecordId);
            `,
            `
                CREATE INDEX idx_maintenance_schedules_vehicle_enabled
                ON maintenance_schedules(vehicleId, enabled);
            `,
            `
                CREATE UNIQUE INDEX idx_maintenance_schedules_active_standard
                ON maintenance_schedules(vehicleId, serviceType)
                WHERE enabled = 1 AND serviceType <> 'OTHER';
            `,
        ],
    },
];
