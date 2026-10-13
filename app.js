// Firebase Web SDK. Replace the config values with your own Firebase project config.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp, setDoc, getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const $ = (id) => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
let currentUser = null, isAdmin = false, category = "सबै", searchTerm = "", savedOnly = false;
let editingId = null, allNews = [], savedIds = new Set(), unsubscribeNews = null, authMode = "login";

$("year").textContent = new Date().getFullYear();
const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const msg = (id, text) => { $(id).textContent = text; };
const dateText = (stamp) => stamp?.toDate ? stamp.toDate().toLocaleDateString("ne-NP") : "भर्खरै";
function showError(error, target="admin-message") {
  console.error(error);
  const friendly = ({
    "auth/email-already-in-use":"यो इमेलबाट खाता पहिल्यै बनेको छ।",
    "auth/invalid-email":"इमेल ठेगाना मिलेन।",
    "auth/invalid-credential":"इमेल वा पासवर्ड मिलेन।",
    "auth/weak-password":"कम्तीमा ६ अक्षरको बलियो पासवर्ड राख्नुहोस्।",
    "permission-denied":"अनुमति छैन। Firebase Security Rules र Admin भूमिका जाँच्नुहोस्।",
    "storage/unauthorized":"फोटो अपलोड गर्ने अनुमति छैन।"
  })[error.code] || error.message || "काम पूरा हुन सकेन।";
  msg(target, friendly);
}
function resetForm() {
  editingId = null; $("news-form").reset(); $("news-form").querySelector('button[type="submit"]').textContent = "समाचार प्रकाशित गर्नुहोस्";
  $("cancel-edit").classList.add("hidden"); msg("admin-message", "");
}
function renderNews() {
  const filtered = allNews.filter(n => {
    const categoryOk = category === "सबै" || n.category === category;
    const searchOk = !searchTerm || `${n.title} ${n.summary} ${n.body} ${n.category}`.toLowerCase().includes(searchTerm.toLowerCase());
    const savedOk = !savedOnly || savedIds.has(n.id);
    return categoryOk && searchOk && savedOk;
  });
  $("news-count").textContent = `${filtered.length} समाचार`;
  $("empty-state").classList.toggle("hidden", filtered.length > 0);
  $("news-list").innerHTML = filtered.map(n => `
    <article class="news-card">
      ${n.imageUrl ? `<img class="news-image" src="${esc(n.imageUrl)}" alt="${esc(n.title)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="news-image" style="display:grid;place-items:center;font-size:52px">📰</div>`}
      <div class="news-card-content">
        <div class="card-meta"><span class="pill">${esc(n.category || "समाचार")}</span><span class="muted">${esc(dateText(n.createdAt))}</span></div>
        <h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p>
        <div class="card-actions">
          <button class="btn primary" data-action="read" data-id="${esc(n.id)}">पूरा पढ्नुहोस्</button>
          <button class="btn light" data-action="save" data-id="${esc(n.id)}">${savedIds.has(n.id) ? "♥ सुरक्षित" : "♡ सुरक्षित"}</button>
          ${isAdmin ? `<button class="btn light" data-action="edit" data-id="${esc(n.id)}">सम्पादन</button><button class="btn light" data-action="delete" data-id="${esc(n.id)}">हटाउनुहोस्</button>` : ""}
        </div>
      </div>
    </article>`).join("");
}
async function loadSaved() {
  savedIds = new Set();
  if (currentUser) {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "bookmarks"));
    snap.forEach(d => savedIds.add(d.id));
  }
  renderNews();
}
function subscribeNews() {
  if (unsubscribeNews) unsubscribeNews();
  // Public feed contains only published news; admin can see drafts via a separate admin query in a larger production app.
  const q = query(collection(db, "news"), where("status", "==", "published"), orderBy("createdAt", "desc"));
  unsubscribeNews = onSnapshot(q, snap => {
    allNews = snap.docs.map(d => ({id:d.id, ...d.data()}));
    renderNews();
  }, err => { showError(err, "admin-message"); $("news-list").innerHTML = '<p class="empty">समाचार लोड भएन। Firebase सेटअप र Security Rules जाँच्नुहोस्।</p>'; });
}
onAuthStateChanged(auth, async user => {
  currentUser = user;
  isAdmin = false;
  if (user) {
    try {
      const token = await user.getIdTokenResult(true);
      isAdmin = token.claims.admin === true;
      // User profile is only for display; it does not grant admin permissions.
      await setDoc(doc(db, "users", user.uid), {email:user.email || "", updatedAt:serverTimestamp()}, {merge:true});
    } catch (e) { console.warn("Profile/admin status:", e.message); }
  }
  $("user-label").textContent = user ? (user.email || "प्रयोगकर्ता") : "अतिथि";
  $("login-btn").classList.toggle("hidden", !!user);
  $("logout-btn").classList.toggle("hidden", !user);
  $("admin-panel").classList.toggle("hidden", !isAdmin);
  await loadSaved().catch(console.warn);
  subscribeNews();
});
$("login-btn").addEventListener("click", () => { authMode="login"; updateAuthMode(); $("auth-dialog").showModal(); });
$("logout-btn").addEventListener("click", async () => { try { await signOut(auth); } catch(e) { alert(e.message); } });
function updateAuthMode() {
  $("auth-title").textContent = authMode === "login" ? "लगइन" : "नयाँ खाता";
  $("auth-submit").textContent = authMode === "login" ? "लगइन" : "खाता बनाउनुहोस्";
  $("toggle-auth").textContent = authMode === "login" ? "नयाँ खाता बनाउनुहोस्" : "पहिल्यै खाता छ? लगइन";
  msg("auth-message", "");
}
$("toggle-auth").addEventListener("click", () => { authMode = authMode === "login" ? "signup" : "login"; updateAuthMode(); });
$("auth-form").addEventListener("submit", async e => {
  e.preventDefault(); msg("auth-message", "प्रक्रिया हुँदैछ…");
  try {
    const email = $("auth-email").value.trim(), password = $("auth-password").value;
    if (authMode === "login") await signInWithEmailAndPassword(auth, email, password);
    else await createUserWithEmailAndPassword(auth, email, password);
    $("auth-dialog").close(); $("auth-form").reset();
  } catch(err) { showError(err, "auth-message"); }
});
$("category-nav").addEventListener("click", e => {
  const b = e.target.closest("button[data-category]"); if (!b) return;
  category = b.dataset.category;
  document.querySelectorAll("#category-nav button").forEach(x => x.classList.toggle("active", x === b));
  $("feed-title").textContent = category === "सबै" ? "ताजा समाचार" : category + " समाचार";
  renderNews();
});
$("search-btn").addEventListener("click", () => { searchTerm=$("search-input").value.trim(); renderNews(); });
$("search-input").addEventListener("keydown", e => { if(e.key==="Enter"){searchTerm=e.target.value.trim();renderNews();} });
$("saved-btn").addEventListener("click", async () => {
  if (!currentUser) { authMode="login"; updateAuthMode(); $("auth-dialog").showModal(); msg("auth-message","बुकमार्क हेर्न पहिले लगइन गर्नुहोस्।"); return; }
  savedOnly = !savedOnly; $("saved-btn").textContent = savedOnly ? "सबै समाचार" : "♡ सुरक्षित समाचार"; renderNews();
});
$("news-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser || !isAdmin) return msg("admin-message", "यो काम एडमिनले मात्र गर्न सक्छ।");
  msg("admin-message", "समाचार सुरक्षित हुँदैछ…");
  try {
    let imageUrl = $("news-image-url").value.trim();
    const file = $("news-image").files[0];
    if (file) {
      if (file.size > 5*1024*1024) throw new Error("फोटो ५ MB भन्दा सानो हुनुपर्छ।");
      if (!file.type.startsWith("image/")) throw new Error("कृपया फोटो फाइल छान्नुहोस्।");
      const path = `news-images/${currentUser.uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const uploaded = await uploadBytes(ref(storage,path), file);
      imageUrl = await getDownloadURL(uploaded.ref);
    }
    const payload = {
      title:$("news-title").value.trim(), category:$("news-category").value,
      summary:$("news-summary").value.trim(), body:$("news-body").value.trim(),
      imageUrl, status:"published", authorUid:currentUser.uid, updatedAt:serverTimestamp()
    };
    if (editingId) await updateDoc(doc(db,"news",editingId), payload);
    else await addDoc(collection(db,"news"), {...payload, createdAt:serverTimestamp(), views:0});
    resetForm(); msg("admin-message","समाचार सफलतापूर्वक प्रकाशित भयो।");
  } catch(err) { showError(err); }
});
$("cancel-edit").addEventListener("click", resetForm);
$("news-list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-action]"); if (!b) return;
  const n = allNews.find(x => x.id === b.dataset.id); if (!n) return;
  try {
    if (b.dataset.action === "read") {
      $("article-content").innerHTML = `${n.imageUrl ? `<img src="${esc(n.imageUrl)}" alt="">` : ""}<span class="pill">${esc(n.category||"समाचार")}</span><h2>${esc(n.title)}</h2><p class="muted">${esc(dateText(n.createdAt))}</p><p>${esc(n.body || n.summary)}</p>`;
      $("article-dialog").showModal();
    } else if (b.dataset.action === "save") {
      if (!currentUser) { authMode="login"; updateAuthMode(); $("auth-dialog").showModal(); msg("auth-message","समाचार सुरक्षित गर्न लगइन गर्नुहोस्।"); return; }
      const bookmarkRef = doc(db,"users",currentUser.uid,"bookmarks",n.id);
      if (savedIds.has(n.id)) { await deleteDoc(bookmarkRef); savedIds.delete(n.id); }
      else { await setDoc(bookmarkRef,{newsId:n.id,createdAt:serverTimestamp()}); savedIds.add(n.id); }
      renderNews();
    } else if (b.dataset.action === "edit" && isAdmin) {
      editingId=n.id; $("news-title").value=n.title; $("news-category").value=n.category||"समाज";
      $("news-image-url").value=n.imageUrl||""; $("news-summary").value=n.summary||""; $("news-body").value=n.body||"";
      $("news-form").querySelector('button[type="submit"]').textContent="परिवर्तन सुरक्षित गर्नुहोस्";
      $("cancel-edit").classList.remove("hidden"); $("admin-panel").scrollIntoView({behavior:"smooth"});
    } else if (b.dataset.action === "delete" && isAdmin) {
      if (confirm("यो समाचार स्थायी रूपमा हटाउने हो?")) await deleteDoc(doc(db,"news",n.id));
    }
  } catch(err) { alert(err.message || "काम पूरा हुन सकेन।"); }
});
$("close-article").addEventListener("click", () => $("article-dialog").close());

