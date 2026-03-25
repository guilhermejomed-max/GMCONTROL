import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

// Import the Firebase configuration from the auto-generated file
let firebaseConfig: any = null;

async function loadConfig() {
    try {
        // Try to fetch the config file at runtime
        // In Vite, files in public/ are served at the root
        const configUrl = '/firebase-applet-config.json';
        console.log(`[Firebase] Attempting to fetch config from: ${configUrl}`);
        const response = await fetch(configUrl);
        if (response.ok) {
            firebaseConfig = await response.json();
            console.log("[Firebase] Config loaded successfully from fetch", {
                projectId: firebaseConfig.projectId,
                databaseId: firebaseConfig.firestoreDatabaseId
            });
        } else {
            console.warn(`[Firebase] Fetch failed with status: ${response.status}`);
        }
    } catch (e) {
        console.warn("[Firebase] Could not fetch /firebase-applet-config.json, trying dynamic import...");
    }

    if (!firebaseConfig) {
        try {
            // Fallback to dynamic import from root (Vite might resolve this if configured)
            // @ts-ignore
            firebaseConfig = await import('../firebase-applet-config.json').then(m => m.default || m);
            console.log("[Firebase] Config loaded via dynamic import from root");
        } catch (err) {
            console.warn("[Firebase] Config not found in root, using fallback config");
            // Use the actual project ID from the file I read earlier as fallback
            firebaseConfig = {
                apiKey: "AIzaSyA2nPD2i7ibk85czXx-eVrnM72YsnCfof0",
                authDomain: "gen-lang-client-0668489667.firebaseapp.com",
                projectId: "gen-lang-client-0668489667",
                storageBucket: "gen-lang-client-0668489667.firebasestorage.app",
                messagingSenderId: "978378900697",
                appId: "1:978378900697:web:3f89552ffd6b68450f2ac8",
                firestoreDatabaseId: "ai-studio-20dca5fb-329b-4dac-ab8e-7ee19f38f344"
            };
        }
    }
}

await loadConfig();

// Initialize App
let app: firebase.app.App | undefined;
let db: firebase.firestore.Firestore | undefined;
let auth: firebase.auth.Auth | undefined;

try {
    if (firebaseConfig && firebaseConfig.projectId) {
        console.log("Initializing Firebase with project:", firebaseConfig.projectId);
        
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        
        // Use the specific database ID if provided in the config
        if (firebaseConfig.firestoreDatabaseId) {
            console.log("Using named database:", firebaseConfig.firestoreDatabaseId);
            // @ts-ignore - compat SDK supports this for named databases
            db = firebase.app().firestore(firebaseConfig.firestoreDatabaseId);
        } else {
            console.log("Using default database (default)");
            db = firebase.firestore();
        }
        auth = app.auth();

        // Configure Firestore settings
        if (db) {
            db.settings({ 
                experimentalForceLongPolling: true,
                ignoreUndefinedProperties: true
            });
        }
        console.log("Firebase initialized successfully");
    } else {
        console.error("No valid Firebase configuration found after loading attempts");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// Export safely
export { db, auth };
export default app;
