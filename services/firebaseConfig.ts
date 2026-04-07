// Force update
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

import firebaseConfigData from "../firebase-applet-config.json";

export const firebaseConfig = firebaseConfigData;

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
    
    // Suppress benign warnings from Firestore SDK (e.g., idle stream timeouts)
    firebase.firestore.setLogLevel('error');
    
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
    
    // Validate Connection to Firestore
    const testConnection = async () => {
        try {
            if (db) {
                // Use get({ source: 'server' }) for compat SDK to force a server check
                await db.collection('test').doc('connection').get({ source: 'server' });
                console.log("Firestore connection test successful");
            }
        } catch (error) {
            if(error instanceof Error && error.message.includes('the client is offline')) {
                console.error("Please check your Firebase configuration. The client is offline.");
            }
            // Skip logging for other errors, as this is simply a connection test.
        }
    };
    testConnection();
    
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// Export safely
export { db, auth };
export default app;
