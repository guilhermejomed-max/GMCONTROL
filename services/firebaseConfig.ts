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
    
    // Find an existing app with the correct project ID
    const existingApp = firebase.apps.find(a => (a.options as any).projectId === firebaseConfig.projectId);
    
    if (existingApp) {
        app = existingApp;
        console.log("Using existing Firebase app");
    } else {
        // If no app has the correct config, initialize a new one
        // Use a unique name if apps already exist to avoid '[DEFAULT] already exists' error
        const appName = firebase.apps.length > 0 ? `gmcontrol-${Date.now()}` : undefined;
        app = firebase.initializeApp(firebaseConfig, appName);
        console.log("Initialized new Firebase app");
    }
    
    db = app.firestore();
    auth = app.auth();

    // Configure Firestore settings
    try {
        db.settings({ 
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true
        });
    } catch (settingErr) {
        // Ignore settings errors if already configured
        console.log("Firestore settings already configured or failed:", settingErr);
    }
    
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// Export safely
export { db, auth };
export default app;
