const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function run() {
  let totalReportsDeleted = 0;
  
  // 1. Delete reports where reporterId == "authority-seeded"
  const seededReportsSnap = await db.collection('reports').where('reporterId', '==', 'authority-seeded').get();
  
  if (!seededReportsSnap.empty) {
    const batch = db.batch();
    seededReportsSnap.forEach(doc => {
      batch.delete(doc.ref);
      totalReportsDeleted++;
    });
    await batch.commit();
    console.log(`Deleted ${seededReportsSnap.size} reports seeded by "authority-seeded".`);
  } else {
    console.log('No "authority-seeded" reports found.');
  }

  // 2. Delete reports with ID starting with "seed-"
  // Since we can't easily query by ID prefix in Firestore without a specific field, we just fetch all and filter,
  // or we can just fetch all reports and delete if ID starts with 'seed-'.
  // We'll just fetch all reports.
  const allReportsSnap = await db.collection('reports').get();
  const seedPrefixBatch = db.batch();
  let prefixCount = 0;
  
  allReportsSnap.forEach(doc => {
    if (doc.id.startsWith('seed-')) {
      seedPrefixBatch.delete(doc.ref);
      prefixCount++;
      totalReportsDeleted++;
    }
  });
  
  if (prefixCount > 0) {
    await seedPrefixBatch.commit();
    console.log(`Deleted ${prefixCount} reports with ID prefix "seed-".`);
  } else {
    console.log('No reports with "seed-" ID prefix found.');
  }

  // 3. Delete mock users
  const mockUids = ['mock-uid-1', 'mock-uid-2', 'mock-uid-3'];
  const userBatch = db.batch();
  for (const uid of mockUids) {
    userBatch.delete(db.collection('users').doc(uid));
  }
  await userBatch.commit();
  console.log(`Deleted mock users: ${mockUids.join(', ')}.`);
  
  console.log(`Finished. Total reports deleted: ${totalReportsDeleted}`);
}

run().catch(console.error);
