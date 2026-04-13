// Force update
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

import firebaseConfigData from "../firebase-applet-config.json";

export const firebaseConfig = firebaseConfigData;

// Initialize App
let app: firebase.app.App;
let db: firebase.firestore.Firestore;
let auth: firebase.auth.Auth;

if (firebase.apps.length === 0) {
    app = firebase.initializeApp(firebaseConfig);
    db = app.firestore();
    auth = app.auth();

    // Configure Firestore settings FIRST
    try {
        db.settings({ 
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true
        });
    } catch (settingErr) {
        console.warn("Firestore settings already configured:", settingErr);
    }

    // Enable local persistence
    try {
        db.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("Persistence failed: Multiple tabs open");
                } else if (err.code === 'unimplemented') {
                    console.warn("Persistence failed: Browser not supported");
                }
            });
    } catch (persistenceErr) {
        console.warn("Persistence already enabled or failed:", persistenceErr);
    }

    console.log("Initialized new Firebase app and configured Firestore");
} else {
    app = firebase.app();
    db = app.firestore();
    auth = app.auth();
    console.log("Using existing Firebase app");
}

// Suppress benign warnings from Firestore SDK (e.g., idle stream timeouts)
firebase.firestore.setLogLevel('error');
    
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

// Export safely
export { db, auth };
export default app;
