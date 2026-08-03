import {
    CapacitorSQLite,
    SQLiteConnection,
    SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

class DatabaseService {
    private sqliteConnection: SQLiteConnection | null = null;
    private dbConnection: SQLiteDBConnection | null = null;
    private readonly dbName = "car_log_db";

    async initialize(): Promise<void> {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);

        // Get platform
        const platform = Capacitor.getPlatform();
        if (platform === "web") {
            await this.sqliteConnection.initWebStore();
        }

        const consistency =
            await this.sqliteConnection.checkConnectionsConsistency();
        const isConnection = await this.sqliteConnection.isConnection(
            this.dbName,
            false,
        );

        if (consistency.result && isConnection.result) {
            this.dbConnection = await this.sqliteConnection.retrieveConnection(
                this.dbName,
                false,
            );
        } else {
            this.dbConnection = await this.sqliteConnection.createConnection(
                this.dbName,
                false,
                "no-encryption",
                1,
                false,
            );
        }

        await this.dbConnection.open();
        await this.initializeTables();
    }

    private async initializeTables(): Promise<void> {
        if (!this.dbConnection)
            throw new Error("Database connection not open.");

        const createVehiclesTableQuery = `
            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT PRIMARY KEY NOT NULL,
                make TEXT NOT NULL,
                model TEXT NOT NULL,
                year INTEGER NOT NULL,
                vin TEXT,
                licensePlate TEXT,
                engineType TEXT,
                currentMileage INTEGER
            );
        `;

        const createMaintenanceRecordsTableQuery = `
            CREATE TABLE IF NOT EXISTS maintenance_records (
                id TEXT PRIMARY KEY NOT NULL,
                vehicleId TEXT NOT NULL,
                type TEXT NOT NULL,
                date TEXT NOT NULL,
                mileage INTEGER NOT NULL,
                cost REAL,
                shopName TEXT,
                notes TEXT,
                FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
            );
        `;

        const createRepairRecordsTableQuery = `
            CREATE TABLE IF NOT EXISTS repair_records (
                id TEXT PRIMARY KEY NOT NULL,
                partReplaced TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES maintenance_records(id) ON DELETE CASCADE
            );
        `;

        const createPreventativeRecordsTableQuery = `
            CREATE TABLE IF NOT EXISTS preventative_records (
                id TEXT PRIMARY KEY NOT NULL,
                nextServiceMileage INTEGER,
                nextServiceDate TEXT,
                FOREIGN KEY (id) REFERENCES maintenance_records(id) ON DELETE CASCADE
            )
        `;

        const createOilChangeRecordsTableQuery = `
            CREATE TABLE oil_change_records (
                id TEXT PRIMARY KEY NOT NULL,
                filterReplaced INTEGER,
                oilType TEXT,
                FOREIGN KEY (id) REFERENCES preventative_records(id) ON DELETE CASCADE
            );
        `;

        const createTireRotationRecordsTableQuery = `
            CREATE TABLE tire_rotation_records (
                id TEXT PRIMARY KEY,
                treadDepthRemaining REAL,
                FOREIGN KEY (id) REFERENCES preventative_records(id) ON DELETE CASCADE
            );
        `;

        await this.dbConnection.execute(createVehiclesTableQuery);
        await this.dbConnection.execute(createMaintenanceRecordsTableQuery);
        await this.dbConnection.execute(createRepairRecordsTableQuery);
        await this.dbConnection.execute(createPreventativeRecordsTableQuery);
        await this.dbConnection.execute(createOilChangeRecordsTableQuery);
        await this.dbConnection.execute(createTireRotationRecordsTableQuery);
    }

    getDb(): SQLiteDBConnection {
        if (!this.dbConnection) {
            throw new Error(
                "Database connection has not been established yet.",
            );
        }
        return this.dbConnection;
    }
}

export const databaseService = new DatabaseService();
