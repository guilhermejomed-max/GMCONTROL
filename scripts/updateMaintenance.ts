import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const data = [
  { placa: "TMD5G27", data: "27/02/2026", km: 123299 },
  { placa: "QSY5D29", data: "13/12/2025", km: 29675 },
  { placa: "EVS7J83", data: "28/01/2026", km: 74423 },
  { placa: "DAJ5H64", data: "19/01/2026", km: 60219 },
  { placa: "EVS1F71", data: "11/02/2026", km: 75000 },
  { placa: "EVS8J83", data: "13/01/2026", km: 0 },
  { placa: "SUU4F68", data: "07/01/2026", km: 268553 },
  { placa: "SSY1F91", data: "24/01/2026", km: 289049 },
  { placa: "DAJ4J42", data: "01/12/2025", km: 244955 },
  { placa: "UFC0A49", data: "14/01/2026", km: 49452 },
  { placa: "SSX0I98", data: "04/11/2025", km: 278042 },
  { placa: "FSS2H65", data: "03/09/2025", km: 467346 },
  { placa: "SSW3A65", data: "06/01/2026", km: 303123 },
  { placa: "GDH6B36", data: "29/11/2025", km: 669035 },
  { placa: "TBC3H66", data: "13/01/2026", km: 123675 },
  { placa: "EVS3C41", data: "05/02/2026", km: 128677 },
  { placa: "FXE0G65", data: "08/09/2025", km: 390224 },
  { placa: "DAJ3J21", data: "08/12/2025", km: 166035 },
  { placa: "TMD0A68", data: "29/12/2025", km: 123809 },
  { placa: "FCY4A78", data: "25/11/2025", km: 641772 },
  { placa: "BZR8G23", data: "22/10/2025", km: 348621 },
  { placa: "SUG2E86", data: "26/02/2026", km: 91435 },
  { placa: "UFC0A27", data: "12/01/2026", km: 42730 },
  { placa: "SVO4D71", data: "22/12/2025", km: 229844 },
  { placa: "RKO8C83", data: "27/06/2025", km: 81091 },
  { placa: "TBH7I48", data: "12/01/2026", km: 82371 },
  { placa: "SFQ5D29", data: "17/12/2025", km: 405683 },
  { placa: "FPY7H26", data: "06/01/2026", km: 540333 },
  { placa: "UFC0A29", data: "12/01/2026", km: 40833 },
  { placa: "SUO9A93", data: "27/01/2026", km: 281274 },
  { placa: "GDX8B75", data: "20/01/2026", km: 438962 },
  { placa: "FOR9479", data: "14/06/2025", km: 573737 },
  { placa: "GDF7E16", data: "19/09/2025", km: 477616 },
  { placa: "FLZ6H98", data: "08/11/2025", km: 355187 },
  { placa: "GIE3049", data: "26/04/2025", km: 921046 },
  { placa: "SVL0G47", data: "03/02/2026", km: 238088 },
  { placa: "STT6D12", data: "06/01/2026", km: 277752 },
  { placa: "SWT7A63", data: "17/01/2026", km: 251977 },
  { placa: "FHH3D41", data: "20/01/2026", km: 336707 },
  { placa: "FYB4J63", data: "28/01/2026", km: 350484 },
  { placa: "GDL1A61", data: "09/01/2026", km: 861386 },
  { placa: "GIK1J15", data: "07/01/2026", km: 617893 },
  { placa: "GHZ5H28", data: "08/10/2025", km: 346590 },
  { placa: "DAJ4J62", data: "17/12/2025", km: 154640 },
  { placa: "UFC0A09", data: "10/01/2026", km: 40834 },
  { placa: "EHH3A75", data: "05/01/2026", km: 537135 },
  { placa: "TBC3H54", data: "02/01/2026", km: 120300 },
  { placa: "GHE3H15", data: "26/09/2025", km: 438264 },
  { placa: "FQQ7E61", data: "08/01/2026", km: 381769 },
  { placa: "TBC3H50", data: "30/01/2026", km: 172145 },
  { placa: "FPQ6D14", data: "15/01/2026", km: 372416 },
  { placa: "FPQ1F05", data: "24/10/2025", km: 368136 },
  { placa: "FDD9I91", data: "27/12/2025", km: 537281 },
  { placa: "TJQ4F58", data: "10/11/2025", km: 40586 },
  { placa: "FYJ4F24", data: "27/12/2025", km: 565483 },
  { placa: "UFC0A25", data: "15/01/2026", km: 41919 },
  { placa: "TKI6H95", data: "30/12/2025", km: 121812 },
  { placa: "GHV9759", data: "07/03/2025", km: 900129 },
  { placa: "TBH7I71", data: "02/02/2026", km: 121221 },
  { placa: "UFC0A06", data: "16/01/2026", km: 40830 },
  { placa: "FCO8E14", data: "30/01/2026", km: 390347 },
  { placa: "RJG8E39", data: "11/03/2025", km: 81115 },
  { placa: "JAX7F40", data: "08/09/2025", km: 359102 },
  { placa: "EVS1J52", data: "24/02/2026", km: 104327 },
  { placa: "TBG4B71", data: "21/01/2026", km: 122071 },
  { placa: "GBB9G73", data: "19/01/2026", km: 528071 },
  { placa: "FXG9H71", data: "14/02/2026", km: 384765 },
  { placa: "DAJ4J82", data: "07/02/2026", km: 211952 },
  { placa: "GDD2C85", data: "04/02/2026", km: 447649 },
  { placa: "UFC2F15", data: "21/01/2026", km: 42439 },
  { placa: "FMZ9F05", data: "19/02/2026", km: 411878 },
  { placa: "FGX8606", data: "15/11/2025", km: 720424 },
  { placa: "FYZ5B31", data: "21/02/2026", km: 623299 },
  { placa: "SVP5C71", data: "21/02/2026", km: 243002 },
  { placa: "GHZ8D73", data: "20/01/2026", km: 374745 },
  { placa: "SUO7C54", data: "28/01/2026", km: 61026 },
  { placa: "TBH7I72", data: "16/02/2026", km: 120357 },
  { placa: "SWW1J95", data: "17/01/2026", km: 211819 },
  { placa: "SST7H08", data: "23/01/2026", km: 303485 },
  { placa: "GGV5D15", data: "08/09/2025", km: 164439 },
  { placa: "SVM0A66", data: "31/01/2026", km: 205071 },
  { placa: "FTE0E41", data: "04/11/2025", km: 516311 },
  { placa: "TIS3G34", data: "11/03/2026", km: 126845 },
  { placa: "FXE0H43", data: "25/09/2025", km: 203197 },
  { placa: "DDF3G21", data: "18/11/2025", km: 188927 },
  { placa: "EHH1962", data: "13/10/2025", km: 772511 },
  { placa: "SFW8C57", data: "28/02/2026", km: 167819 },
  { placa: "GBT6G75", data: "03/01/2026", km: 336897 },
  { placa: "UFC0A24", data: "10/01/2026", km: 41028 },
  { placa: "GDD7C71", data: "22/01/2026", km: 479317 },
  { placa: "FIE0A42", data: "26/12/2025", km: 30694 },
  { placa: "DAJ5E74", data: "26/02/2026", km: 150794 },
  { placa: "TMD6E28", data: "09/03/2026", km: 170626 },
  { placa: "DAJ5G41", data: "06/03/2026", km: 93144 },
  { placa: "SUB7I83", data: "13/02/2026", km: 246832 },
  { placa: "SWP2G45", data: "02/03/2026", km: 205426 },
  { placa: "GDI8H71", data: "28/01/2026", km: 546794 },
  { placa: "FZO2F64", data: "31/01/2026", km: 212338 },
  { placa: "DAJ5D44", data: "23/02/2026", km: 217263 },
  { placa: "TMD0I78", data: "23/02/2026", km: 162026 }
];

async function updateMaintenance() {
  const vehiclesRef = collection(db, "vehicles");
  
  for (const item of data) {
    const q = query(vehiclesRef, where("plate", "==", item.placa));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, "vehicles", querySnapshot.docs[0].id);
      try {
        await updateDoc(docRef, {
          lastMaintenanceDate: item.data,
          lastMaintenanceKm: item.km
        });
        console.log(`Updated ${item.placa}`);
      } catch (e) {
        console.error(`Error updating ${item.placa}:`, e);
      }
    } else {
      console.warn(`Vehicle not found: ${item.placa}`);
    }
  }
}

updateMaintenance();
