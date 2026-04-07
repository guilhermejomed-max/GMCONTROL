import admin from "firebase-admin";
import { firebaseConfig } from "./firebaseConfig";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
