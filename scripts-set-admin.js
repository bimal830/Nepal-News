// Run from a trusted local machine only; never put service-account keys in public hosting.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json node scripts-set-admin.js user@example.com
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
initializeApp({ credential: applicationDefault() });
(async () => {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: node scripts-set-admin.js user@example.com");
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
  console.log(`Admin claim enabled for ${email}. Sign out and sign in again to refresh the token.`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
