const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Example callable function to process admissions for an institution intake
exports.processAdmissions = functions.https.onCall(async (data, context) => {
  // Basic auth check: allow only admins or institute staff
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Request had no auth');
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const role = userDoc.exists ? userDoc.data().role : null;
  if (role !== 'admin' && role !== 'institute') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins or institutes can run admissions');
  }

  const { institutionId, intakeLimit = 30 } = data;
  if (!institutionId) throw new functions.https.HttpsError('invalid-argument', 'institutionId required');

  // Fetch pending applications for institution
  const appsSnap = await db.collection('applications')
    .where('institutionId', '==', institutionId)
    .where('status', '==', 'pending')
    .get();

  const apps = [];
  appsSnap.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));

  // Sort by score (descending) - assume 'score' field exists
  apps.sort((a,b) => (b.score || 0) - (a.score || 0));

  const admitted = apps.slice(0, intakeLimit);
  const waiting = apps.slice(intakeLimit);

  // Update admitted and waiting statuses in batch
  const batch = db.batch();
  admitted.forEach(a => {
    const ref = db.collection('applications').doc(a.id);
    batch.update(ref, { status: 'admitted', admittedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  waiting.forEach(a => {
    const ref = db.collection('applications').doc(a.id);
    batch.update(ref, { status: 'waiting' });
  });

  await batch.commit();
  return { admitted: admitted.length, waiting: waiting.length };
});
