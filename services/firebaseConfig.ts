// Force update
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import firebaseConfig from "../firebase-applet-config.json";

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
    
    // Use the named database provided in the config
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    db = (app as any).firestore(dbId);
    auth = app.auth();

    // Configure Firestore settings for restricted environments
    db.settings({ 
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true
    });
    console.log("Firebase initialized successfully with database:", dbId);
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// Export safely
export { db, auth };
export default app;
