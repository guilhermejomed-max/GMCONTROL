import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "gui@gmail.com", "gui123");
    console.log("Logged in as:", cred.user.uid);
    
    console.log("Querying retread_orders...");
    const retreadDocs = await getDocs(collection(db, "retread_orders"));
    console.log(`Found ${retreadDocs.size} retread_orders.`);

    console.log("Querying employees...");
    const empDocs = await getDocs(collection(db, "employees"));
    console.log(`Found ${empDocs.size} employees.`);

    console.log("Creating employee...");
    const newId = Date.now().toString();
    await setDoc(doc(db, "employees", newId), { 
        id: newId, 
        name: "Test Employee", 
        orgId: "sys",
        role: "ADMIN",
        rg: "123",
        cnh: "123",
        birthDate: "2000-01-01",
        startDate: "2020-01-01",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    console.log("Created employee.");

    process.exit(0);
  } catch (err: any) {
    console.error("Firestore Error:", err.message);
    process.exit(1);
  }
}

run();
