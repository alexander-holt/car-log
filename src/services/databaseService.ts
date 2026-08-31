import {
    CapacitorSQLite,
    SQLiteConnection,
    SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import { DATABASE_MIGRATIONS, DATABASE_VERSION } from "./databaseMigrations";

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

        await this.sqliteConnection.addUpgradeStatement(
            this.dbName,
            DATABASE_MIGRATIONS,
        );

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
                DATABASE_VERSION,
                false,
            );
        }

        await this.dbConnection.open();
        await this.dbConnection.execute("PRAGMA foreign_keys = ON;");
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
