# नेपाल न्युज — Firebase Starter

यो HTML/CSS/JavaScript + Firebase Web SDK को चलाउन मिल्ने starter project हो। Firebase project configuration र rules सेट गरेपछि वास्तविक Firebase Authentication, Firestore news feed, bookmarks र Storage image upload प्रयोग गर्छ।

## 1. Firebase Project सेटअप
1. https://console.firebase.google.com मा project बनाउनुहोस्.
2. Build → Authentication → Sign-in method मा **Email/Password** enable गर्नुहोस्.
3. Build → Firestore Database → Create database गर्नुहोस्.
4. Build → Storage → Get started गर्नुहोस्.
5. Project settings → General → Your apps → Web app दर्ता गरेर Firebase config लिनुहोस्.
6. `public/app.js` को `firebaseConfig` मा आफ्नै `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` राख्नुहोस्.
7. Firestore Rules मा `firestore.rules` र Storage Rules मा `storage.rules` को सामग्री publish गर्नुहोस्.

## 2. पहिलो Admin बनाउने
1. Firebase Authentication मा इमेल/पासवर्डबाट आफ्नो account बनाउनुहोस्.
2. आफ्नो कम्प्युटरमा Node.js LTS install गर्नुहोस्.
3. Project root मा `npm install firebase-admin` चलाउनुहोस्.
4. Firebase Console → Project settings → Service accounts → Generate new private key बाट JSON key सुरक्षित ठाउँमा राख्नुहोस्. यसलाई GitHub, वेबसाइट वा मोबाइल एपमा नराख्नुहोस्.
5. `GOOGLE_APPLICATION_CREDENTIALS=/secure/path/key.json node scripts-set-admin.js your-email@example.com` चलाउनुहोस् (Windows PowerShell मा environment variable को syntax फरक हुन्छ).
6. एपबाट sign out/sign in गर्नुहोस्; Admin panel देखिनुपर्छ.

**सुरक्षा:** `admin` custom claim केवल Admin SDK बाट सेट हुन्छ। Firestore मा `users/{uid}.role = "admin"` लेखेर एडमिन बन्न दिने होइन।

## 3. स्थानीय रूपमा चलाउने
ES modules का लागि `file://` बाट नखोल्नुहोस्; local web server वा Firebase Hosting प्रयोग गर्नुहोस्.

Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase emulators:start
```
Hosting deploy:
```bash
firebase deploy --only hosting,firestore:rules,storage
```
Cloud Functions deploy गर्न:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
Cloud Functions deploy गर्न billing plan/region/API prerequisites шаарिएको हुन सक्छ. Deploy अघि Firebase Console मा current plan requirements जाँच्नुहोस्.

## 4. Одоогийн функцууд
- Email/password signup and login/logout
- Published news realtime feed
- Category filtering and client-side search
- News article detail dialog
- Admin-only create/edit/delete
- Admin image upload to Firebase Storage (5 MB max)
- User bookmarks stored in Firestore
- Firestore/Storage security rules using admin custom claims
- Sample Cloud Function and protected admin-role callable

## 5. उत्पादनमा लैजानुअघि
- Admin panel मा draft/pending moderation, audit logs र pagination थप्नुहोस्.
- News images को पुराना files delete गर्ने Storage cleanup थप्नुहोस्.
- Comments, push notifications, analytics, reporting, share links, RSS/import र moderation workflow छुट्टै implement/test गर्नुहोस्.
- App Check, email verification, password reset, rate limiting, backups, monitoring र privacy policy सेट गर्नुहोस्.
- Search अहिले लोड भएका समाचारमा browser-side search हो; ठूलो डेटाका लागि Algolia/Meilisearch वा उचित indexing प्रयोग गर्नुहोस्.
- समाचारको body trusted admin बाट मात्र publish गर्नुहोस्; बाहिरी स्रोतबाट आएको सामग्रीको तथ्य-जाँच गर्नुहोस्.

यो starter मा वास्तविक Firebase connection छ, तर तपाईंको Firebase project config भरेर rules publish नगरेसम्म live data ажил्दैन.
