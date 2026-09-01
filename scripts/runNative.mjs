import { spawn } from "node:child_process";
import process from "node:process";

try {
    process.loadEnvFile(".env.local");
} catch (error) {
    if (error?.code !== "ENOENT") {
        throw error;
    }
}

const platform = process.argv[2];
const platformOptions = {
    ios: ["-l", "--consolelogs", "--host=localhost"],
    android: ["-l", "--consolelogs", "--external"],
};
const targetVariables = {
    ios: "CARLOG_IOS_TARGET",
    android: "CARLOG_ANDROID_TARGET",
};

if (!(platform in platformOptions)) {
    console.error("Expected an ios or android platform argument.");
    process.exit(1);
}

const target = process.env[targetVariables[platform]]?.trim();
if (target && !/^[A-Za-z0-9._:-]+$/.test(target)) {
    console.error(
        `${targetVariables[platform]} contains unsupported characters.`,
    );
    process.exit(1);
}

const ionicArguments = ["cap", "run", platform, ...platformOptions[platform]];
if (target) {
    ionicArguments.push(`--target=${target}`);
}

const isWindows = process.platform === "win32";
const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "ionic";
const commandArguments = isWindows
    ? ["/d", "/s", "/c", "ionic", ...ionicArguments]
    : ionicArguments;
const ionicProcess = spawn(command, commandArguments, { stdio: "inherit" });

ionicProcess.on("error", (error) => {
    console.error(`Unable to start the Ionic CLI: ${error.message}`);
    process.exit(1);
});

ionicProcess.on("exit", (code) => {
    process.exit(code ?? 1);
});
