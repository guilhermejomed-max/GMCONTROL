// Force update
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

try {
    console.log("Initializing Firebase with project:", firebaseConfig.projectId);
    // Initialize Firebase using the imported SDK
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    
    db = app.firestore();
    auth = app.auth();

    // Configure Firestore settings
    db.settings({ 
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true
    });
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// Export safely
export { db, auth };
export default app;
