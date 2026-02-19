import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDdAH3_U_d5fKJIK21VP7rSeD5aUjJ0Db4",
  authDomain: "gmcontrol-42fd3.firebaseapp.com",
  projectId: "gmcontrol-42fd3",
  storageBucket: "gmcontrol-42fd3.firebasestorage.app",
  messagingSenderId: "190319713049",
  appId: "1:190319713049:web:f3f9f6e7718af13ae64388"
};

// Initialize App
let app: firebase.app.App | undefined;
let db: firebase.firestore.Firestore | undefined;
let auth: firebase.auth.Auth | undefined;

// Safe initialization handling for missing window.firebase (e.g. adblockers/offline)
const win = window as any;
if (win.firebase) {
    try {
        app = win.firebase.apps.length > 0 ? win.firebase.app() : win.firebase.initializeApp(firebaseConfig);
        db = app!.firestore();
        auth = app!.auth();

        // Configure Firestore settings
        try {
            db.settings({ 
                experimentalForceLongPolling: true,
                ignoreUndefinedProperties: true
            });
        } catch (e) {
            console.warn("Firestore settings configuration failed or already configured", e);
        }
    } catch (e) {
        console.error("Firebase init failed:", e);
    }
} else {
    console.error("Firebase SDK not loaded");
}

// Export safely
export { db, auth };
export default app;