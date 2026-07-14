import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;

function loadServiceAccountFromFile(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const rel = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (!rel) return null;

  const filePath = resolve(process.cwd(), rel);
  if (!existsSync(filePath)) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_PATH not found: ${filePath}. Download the JSON from Firebase Console → Project settings → Service accounts → Generate new private key.`,
    );
  }

  const json = JSON.parse(readFileSync(filePath, "utf8")) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new Error(
      "Service account JSON is missing project_id, client_email, or private_key.",
    );
  }

  return {
    projectId: json.project_id,
    clientEmail: json.client_email,
    privateKey: json.private_key,
  };
}

function loadServiceAccountFromEnv(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) return null;

  if (privateKey.length < 200 || !privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY looks invalid. Use the full private_key from your service account JSON (1700+ characters), or set FIREBASE_SERVICE_ACCOUNT_PATH to the JSON file instead.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

function initAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const creds =
    loadServiceAccountFromFile() ?? loadServiceAccountFromEnv();

  if (!creds) {
    throw new Error(
      "Missing Firebase Admin credentials. Either set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json (recommended), or set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.",
    );
  }

  adminApp = initializeApp({
    credential: cert(creds),
  });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(initAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(initAdminApp());
}
