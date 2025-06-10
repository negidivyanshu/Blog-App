import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAzjWGO-MvvFpz6TgNiEPgPjK5SEYH5EGQ",
  authDomain: "blog-app-1c91c.firebaseapp.com",
  projectId: "blog-app-1c91c",
  storageBucket: "blog-app-1c91c.appspot.com",
  messagingSenderId: "722022572280",
  appId: "1:722022572280:web:758d6cae694206950a9b0d",
  measurementId: "G-5093G58SHZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔒 Ensure username prompt and store in Firestore
async function ensureUsername(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const username = prompt("Choose a username:");
    if (!username) return alert("Username is required");
    await setDoc(userRef, { username });
    await updateProfile(user, { displayName: username });
  }
}

// 📌 Sign up
const signupBtn = document.getElementById("signup-btn");
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureUsername(cred.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

// 🔓 Login
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await ensureUsername(cred.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

// 🚪 Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

// 📰 Load posts
async function loadPosts() {
  const postContainer = document.getElementById("posts");
  if (!postContainer) return;

  postContainer.innerHTML = "";

  try {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      postContainer.innerHTML = "<p>No posts yet.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp?.seconds
        ? new Date(data.timestamp.seconds * 1000).toLocaleString()
        : "Unknown time";

      const div = document.createElement("div");
      div.className = "post mb-4 p-3 bg-white shadow rounded";
      div.innerHTML = `
        <h4>${data.title}</h4>
        <p>${data.content}</p>
        <small class="text-muted">Posted by <strong>${data.author || "Anonymous"}</strong> on ${date}</small>
      `;
      postContainer.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading posts:", error);
    postContainer.innerHTML = "<p class='text-danger'>Failed to load posts.</p>";
  }
}

// 📝 Publish post
const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.addEventListener("click", async () => {
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const user = auth.currentUser;

    if (!title || !content) return alert("Fill all fields");
    if (!user) return alert("Not authenticated");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const author = userSnap.exists() ? userSnap.data().username : (user.displayName || user.email);

    await addDoc(collection(db, "posts"), {
      title,
      content,
      userId: user.uid,
      author,
      timestamp: Timestamp.now()
    });

    loadPosts();
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
  });
}

// 👀 Auto-load posts
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const name = userSnap.exists()
      ? userSnap.data().username
      : (user.displayName || user.email);

    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.textContent = name;

    loadPosts();
  } else {
    loadPosts(); // still load public posts
  }
});

