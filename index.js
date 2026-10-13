const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();

// Callable function example: only an existing admin can assign/remove admin claims.
// To bootstrap the FIRST admin, use scripts/set-admin.js from a trusted local environment.
exports.setAdminRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Only an administrator can change roles.");
  }
  const uid = request.data && request.data.uid;
  const enabled = request.data && request.data.enabled;
  if (typeof uid !== "string" || typeof enabled !== "boolean") {
    throw new HttpsError("invalid-argument", "Provide uid and enabled.");
  }
  const user = await getAuth().getUser(uid);
  await getAuth().setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: enabled });
  return { ok: true, uid, admin: enabled };
});

// Example trusted server-side trigger. Increase views through a callable/transaction in a production implementation.
exports.onNewsCreated = onDocumentCreated("news/{newsId}", async (event) => {
  const data = event.data && event.data.data();
  if (!data) return;
  await db.collection("newsStats").doc(event.params.newsId).set({
    createdAt: FieldValue.serverTimestamp(),
    category: data.category || "अन्य",
    status: data.status || "draft"
  }, { merge: true });
});
