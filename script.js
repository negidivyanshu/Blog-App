import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { collection, query, where, orderBy, getDocs, getFirestore, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

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

// Init services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth State Change
onAuthStateChanged(auth, (user) => {
  const blogSection = document.getElementById("blog-section");
  const authSection = document.getElementById("auth-section");

  if (user) {
    blogSection.style.display = "block";
    authSection.style.display = "none";
    loadPosts(user.uid);
  } else {
    blogSection.style.display = "none";
    authSection.style.display = "block";
  }
});

// Handlers
function signUp() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, pass).catch(alert);
}

function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, pass).catch(alert);
}

function logout() {
  signOut(auth);
}

function addPost() {
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const user = auth.currentUser;

  if (!title || !content) return alert("Fill all fields");

  addDoc(collection(db, "posts"), {
    title,
    content,
    userId: user.uid,
    timestamp: Date.now()
  }).then(() => {
    loadPosts(user.uid);
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
  });
}

async function loadPosts(uid) {
  const postContainer = document.getElementById("posts");
  postContainer.innerHTML = "";

  try {
    const q = query(
      collection(db, "posts"),
      where("userId", "==", uid),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      postContainer.innerHTML = "<p>No posts yet.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `<h2>${data.title}</h2><p>${data.content}</p>`;
      postContainer.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}


// Event Listeners
document.getElementById("signup-btn").addEventListener("click", signUp);
document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("logout-btn").addEventListener("click", logout);
document.getElementById("publish-btn").addEventListener("click", addPost);

