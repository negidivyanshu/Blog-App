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

const currentPage = window.location.pathname.split("/").pop() || "index.html";
const isDashboard = currentPage === "dashboard.html";

function firestoreErrorMessage(error, action) {
  if (error?.code === "permission-denied") {
    return `Firestore denied ${action}. Publish the rules from firestore.rules in the Firebase Console for project ${firebaseConfig.projectId}.`;
  }
  return `Unable to ${action}. ${error?.message || "Please try again."}`;
}

async function ensureUsername(user, requestedUsername = "") {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) return userSnap.data().username;

  const username = (requestedUsername || prompt("Choose a username:") || "").trim();
  if (!username) throw new Error("Username is required.");

  await setDoc(userRef, { username });
  if (user.displayName !== username) {
    await updateProfile(user, { displayName: username });
  }
  return username;
}

async function getAccountName(user) {
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists() && userSnap.data().username) {
      return userSnap.data().username;
    }
  } catch (error) {
    console.warn("User profile is unavailable; using the Firebase profile instead.", error);
  }

  return user.displayName || user.email || "Writer";
}

const signupBtn = document.getElementById("signup-btn");
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const username = document.getElementById("username")?.value.trim() || "";

    if (!username && currentPage === "index.html") {
      window.location.href = "signup.html";
      return;
    }
    if (!username) return alert("Please enter a username.");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureUsername(cred.user, username);
      window.location.href = "dashboard.html";
    } catch (err) {
      alert(err.message || "Unable to create your account.");
    }
  });
}

const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      alert(err.message || "Unable to log in.");
    }
  });
}

const sampleBtn = document.getElementById("sample-btn");
if (sampleBtn) {
  sampleBtn.addEventListener("click", () => {
    document.getElementById("email").value = "demo@blogit.dev";
    document.getElementById("password").value = "Blogit123!";
  });
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      alert(err.message || "Unable to log out.");
    }
  });
}

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

    snapshot.forEach(postDoc => {
      const data = postDoc.data();
      const date = data.timestamp?.seconds
        ? new Date(data.timestamp.seconds * 1000).toLocaleString()
        : "Unknown time";

      const div = document.createElement("div");
      div.className = "post mb-4 p-3 bg-white shadow rounded";

      const title = document.createElement("h4");
      title.textContent = data.title || "Untitled post";
      const content = document.createElement("p");
      content.textContent = data.content || "";
      const metadata = document.createElement("small");
      metadata.className = "text-muted";
      metadata.textContent = `Posted by ${data.author || "Anonymous"} on ${date}`;

      div.append(title, content, metadata);
      postContainer.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading posts:", error);
    const errorMessage = document.createElement("p");
    errorMessage.className = "text-danger";
    errorMessage.textContent = firestoreErrorMessage(error, "loading posts");
    postContainer.replaceChildren(errorMessage);
  }
}

const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.addEventListener("click", async () => {
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const user = auth.currentUser;

    if (!title || !content) return alert("Fill all fields");
    if (!user) return alert("Not authenticated");

    try {
      publishBtn.disabled = true;
      const author = await getAccountName(user);
      await addDoc(collection(db, "posts"), {
        title,
        content,
        userId: user.uid,
        author,
        timestamp: Timestamp.now()
      });

      await loadPosts();
      document.getElementById("title").value = "";
      document.getElementById("content").value = "";
    } catch (error) {
      console.error("Error publishing post:", error);
      alert(firestoreErrorMessage(error, "publishing this post"));
    } finally {
      publishBtn.disabled = false;
    }
  });
}

const samplePostBtn = document.getElementById("sample-post-btn");
if (samplePostBtn) {
  samplePostBtn.addEventListener("click", () => {
    document.getElementById("title").value = "The quiet power of starting small";
    document.getElementById("content").value = "Big projects rarely begin with a breakthrough. They begin with one clear sentence, one honest question, and a little time set aside to keep going.\n\nToday, I am choosing progress over polish and publishing the first small step.";
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (isDashboard) window.location.href = "index.html";
    return;
  }

  if (!isDashboard) return;

  try {
    const name = await getAccountName(user);
    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.textContent = name;
    if (isDashboard) await loadPosts();
  } catch (error) {
    console.error("Error loading account:", error);
    alert(error.message || "Unable to load your account.");
  }
});

