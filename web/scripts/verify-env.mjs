import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function readEnvValue(envText, key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function getEnv(key, envText) {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  if (envText) return readEnvValue(envText, key);
  return "";
}

function privateKeyLooksValid(key) {
  if (!key) return false;
  const normalized = key.replace(/\\n/g, "\n");
  return (
    normalized.includes("BEGIN PRIVATE KEY") &&
    normalized.includes("END PRIVATE KEY") &&
    normalized.length >= 200
  );
}

const envPath = join(process.cwd(), ".env");
const onVercel = process.env.VERCEL === "1";
const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

if (!envText && !onVercel) {
  console.error("\n❌ Missing web/.env file.");
  console.error("   Copy .env.example to .env and fill in your Firebase config.\n");
  process.exit(1);
}

const clientVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const missingClient = clientVars.filter((v) => !getEnv(v, envText));
if (missingClient.length > 0) {
  console.error("\n❌ Firebase client env vars are missing or empty:");
  missingClient.forEach((v) => console.error(`   - ${v}`));
  if (onVercel) {
    console.error(
      "\n   Add these in Vercel → Project → Settings → Environment Variables.",
    );
  }
  process.exit(1);
}

const serviceAccountPath = getEnv("FIREBASE_SERVICE_ACCOUNT_PATH", envText);
const hasServiceAccountFile =
  serviceAccountPath && existsSync(join(process.cwd(), serviceAccountPath));

const adminPrivateKey = getEnv("FIREBASE_ADMIN_PRIVATE_KEY", envText);
const hasValidInlineKey = privateKeyLooksValid(adminPrivateKey);

if (!hasServiceAccountFile && !hasValidInlineKey) {
  console.error("\n❌ Firebase Admin credentials are missing or invalid.");
  console.error("   Sign-in will fail after Firebase creates the user.");
  console.error("");
  if (onVercel) {
    console.error("   On Vercel, set these environment variables:");
    console.error("     FIREBASE_ADMIN_PROJECT_ID");
    console.error("     FIREBASE_ADMIN_CLIENT_EMAIL");
    console.error(
      '     FIREBASE_ADMIN_PRIVATE_KEY (full key; use \\n for line breaks)',
    );
  } else {
    console.error("   Recommended (easiest on Windows):");
    console.error("   1. Firebase Console → Project settings → Service accounts");
    console.error("   2. Generate new private key → save JSON as:");
    console.error("      web/firebase-service-account.json");
    console.error("   3. In .env add:");
    console.error(
      "      FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json",
    );
    console.error("");
    console.error("   Or paste the full private_key from that JSON into:");
    console.error(
      '      FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"',
    );
  }
  console.error("");
  if (adminPrivateKey && !hasValidInlineKey) {
    console.error(
      "   Your FIREBASE_ADMIN_PRIVATE_KEY is too short — you need the FULL key from the JSON file, not a snippet.",
    );
  }
  process.exit(1);
}

console.log("✓ Environment check passed (Firebase client + Admin config)");
