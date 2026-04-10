import admin from "firebase-admin";
import { firebaseConfig } from "./firebaseConfig";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
