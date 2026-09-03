import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  doc,
  getDocFromServer,
} from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

// Initialize Firebase App singleton
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();

// Authentication
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Google Drive & Gmail Workspace Scopes
export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
];

GOOGLE_WORKSPACE_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});

// Firestore Database with resilient network configuration
const databaseId = (firebaseConfigJson as any).firestoreDatabaseId || "(default)";

// In browser iframe and cloud container environments, WebSockets can fail or be blocked.
// experimentalForceLongPolling avoids WebSocket dropouts and connection failure warnings.
export const db = initializeFirestore(
  firebaseApp,
  {
    experimentalForceLongPolling: true,
  },
  databaseId
);

// Validate Connection to Firestore on initialization
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore offline mode active: client will sync when network is ready.");
    }
    return false;
  }
}

if (typeof window !== "undefined") {
  testConnection().catch(() => {});
}
