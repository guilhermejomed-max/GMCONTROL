import { db } from './services/firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const DEFAULT_ORG_ID = 'default-org'; // Defina o ID da organização padrão aqui

async function migrate() {
  const collections = ['vehicles', 'tires', 'service_orders'];
  
  for (const colName of collections) {
    console.log(`Migrating collection: ${colName}`);
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    
    for (const document of snapshot.docs) {
      if (!document.data().orgId) {
        console.log(`Updating doc: ${document.id}`);
        await updateDoc(doc(db, colName, document.id), {
          orgId: DEFAULT_ORG_ID
        });
      }
    }
  }
  console.log('Migration completed!');
}

migrate().catch(console.error);
