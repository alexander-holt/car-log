import {
    CapacitorSQLite,
    SQLiteConnection,
    SQLiteDBConnection,
} from "@capacitor-community/sqlite";

class DatabaseService {
    private sqliteConnection: SQLiteConnection | null = null;
    private dbConnection: SQLiteDBConnection | null = null;
    private readonly dbName = "car_log_db";

    async initialize(): Promise<void> {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);

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

        await this.dbConnection.execute(createVehiclesTableQuery);
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
