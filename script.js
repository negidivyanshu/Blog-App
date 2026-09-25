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
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
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
let loadedPosts = [];
let profilePostView = "liked";
let selectedProfileUid = null;

const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("blog-it-theme");
if (savedTheme === "dark") document.body.classList.add("dark-mode");

function updateThemeToggle() {
  const darkMode = document.body.classList.contains("dark-mode");
  if (!themeToggle) return;
  themeToggle.classList.toggle("is-dark", darkMode);
  themeToggle.setAttribute("aria-label", darkMode ? "Enable light mode" : "Enable dark mode");
}

updateThemeToggle();
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("blog-it-theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    updateThemeToggle();
  });
}

function firestoreErrorMessage(error, action) {
  if (error?.code === "permission-denied") {
    return `Firestore denied ${action}. Publish the rules from firestore.rules in the Firebase Console for project ${firebaseConfig.projectId}.`;
  }
  return `Unable to ${action}. ${error?.message || "Please try again."}`;
}

function normalizeUsername(value) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function validateUsername(username) {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3-20 characters using letters, numbers, or underscores.");
  }
}

async function ensureUsername(user, requestedUsername = "") {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) return userSnap.data().username;

  const username = normalizeUsername(requestedUsername || prompt("Choose a username:") || "");
  validateUsername(username);

  const usernameRef = doc(db, "usernames", username);
  const usernameSnap = await getDoc(usernameRef);
  if (usernameSnap.exists()) throw new Error("That username is already taken.");

  await setDoc(userRef, { username: `@${username}` });
  await setDoc(usernameRef, {
    uid: user.uid,
    email: user.email,
    username: `@${username}`
  });
  if (user.displayName !== `@${username}`) {
    await updateProfile(user, { displayName: `@${username}` });
  }
  return `@${username}`;
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

const profileModal = document.getElementById("profile-modal");
const profileForm = document.getElementById("profile-form");
const profileUsername = document.getElementById("profile-username");
const profileBio = document.getElementById("profile-bio");
const profilePosts = document.getElementById("profile-posts");
const profileButton = document.getElementById("profile-btn");

function renderProfilePosts() {
  if (!profilePosts) return;
  const user = auth.currentUser;
  const filteredPosts = loadedPosts.filter(post => {
    if (profilePostView === "authored") return post.userId === selectedProfileUid;
    const values = Array.isArray(post[profilePostView === "liked" ? "likedBy" : "savedBy"])
      ? post[profilePostView === "liked" ? "likedBy" : "savedBy"]
      : [];
    return user && values.includes(user.uid);
  });

  profilePosts.replaceChildren();
  if (!filteredPosts.length) {
    const empty = document.createElement("p");
    empty.className = "profile-empty";
    empty.textContent = profilePostView === "authored"
      ? "This user has not published any posts yet."
      : profilePostView === "liked" ? "Posts you like will appear here." : "Posts you save will appear here.";
    profilePosts.appendChild(empty);
    return;
  }

  filteredPosts.forEach(post => {
    const item = document.createElement("article");
    item.className = "profile-post-item";
    const title = document.createElement("h4");
    title.textContent = post.title || "Untitled post";
    const content = document.createElement("p");
    content.textContent = post.content || "";
    const metadata = document.createElement("small");
    const date = post.timestamp?.seconds
      ? new Date(post.timestamp.seconds * 1000).toLocaleString()
      : "Unknown time";
    metadata.textContent = `Posted by ${post.author || "Anonymous"} on ${date}`;
    item.append(title, content, metadata);
    profilePosts.appendChild(item);
  });
}

async function openProfile(userId, fallbackName, isOwnProfile) {
  if (!profileModal) return;
  selectedProfileUid = userId;
  const userSnap = await getDoc(doc(db, "users", userId));
  const userData = userSnap.exists() ? userSnap.data() : {};
  document.getElementById("profile-modal-title").textContent = userData.username || fallbackName || "Profile";
  document.getElementById("profile-bio-display").textContent = userData.bio || "No bio yet.";
  document.getElementById("profile-bio-display").hidden = isOwnProfile;
  document.getElementById("profile-edit-section").hidden = !isOwnProfile;
  document.getElementById("profile-tabs").hidden = !isOwnProfile;
  document.getElementById("profile-username").value = userData.username || fallbackName || "";
  document.getElementById("profile-bio").value = userData.bio || "";
  document.getElementById("logout-btn").hidden = !isOwnProfile;
  profilePostView = isOwnProfile ? "liked" : "authored";
  if (isOwnProfile) {
    document.getElementById("liked-tab").classList.add("is-active");
    document.getElementById("saved-tab").classList.remove("is-active");
  }
  renderProfilePosts();
  profileModal.hidden = false;
}

function closeProfileDialog() {
  if (profileModal) profileModal.hidden = true;
}

if (profileButton) {
  profileButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || !profileModal) return;
    await openProfile(user.uid, user.displayName || user.email, true);
  });
}

document.getElementById("close-profile-modal")?.addEventListener("click", closeProfileDialog);
document.getElementById("liked-tab")?.addEventListener("click", () => {
  profilePostView = "liked";
  document.getElementById("liked-tab").classList.add("is-active");
  document.getElementById("saved-tab").classList.remove("is-active");
  renderProfilePosts();
});
document.getElementById("saved-tab")?.addEventListener("click", () => {
  profilePostView = "saved";
  document.getElementById("saved-tab").classList.add("is-active");
  document.getElementById("liked-tab").classList.remove("is-active");
  renderProfilePosts();
});

if (profileForm) {
  profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const username = normalizeUsername(profileUsername.value);
    try {
      validateUsername(username);
      const userRef = doc(db, "users", user.uid);
      const currentSnap = await getDoc(userRef);
      const currentUsername = currentSnap.exists() ? normalizeUsername(currentSnap.data().username || "") : "";
      if (username !== currentUsername) {
        const usernameRef = doc(db, "usernames", username);
        if ((await getDoc(usernameRef)).exists()) throw new Error("That username is already taken.");
        await setDoc(usernameRef, { uid: user.uid, email: user.email, username: `@${username}` });
        if (currentUsername) await deleteDoc(doc(db, "usernames", currentUsername));
      }
      await setDoc(userRef, { username: `@${username}`, bio: profileBio.value.trim() }, { merge: true });
      await updateProfile(user, { displayName: `@${username}` });
      document.getElementById("username").textContent = `@${username}`;
      closeProfileDialog();
    } catch (error) {
      alert(error.message || "Unable to save your profile.");
    }
  });
}

const signupBtn = document.getElementById("signup-btn");
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const username = document.getElementById("username")?.value.trim() || "";

    if (currentPage === "index.html") {
      window.location.href = "signup.html";
      return;
    }
    if (!username) return alert("Please enter a username.");

    try {
      const normalizedUsername = normalizeUsername(username);
      validateUsername(normalizedUsername);
      const existingUsername = await getDoc(doc(db, "usernames", normalizedUsername));
      if (existingUsername.exists()) return alert("That username is already taken.");

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
    const usernameInput = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const username = normalizeUsername(usernameInput);
      validateUsername(username);
      const usernameSnap = await getDoc(doc(db, "usernames", username));
      let email;

      if (usernameSnap.exists()) {
        email = usernameSnap.data().email;
      } else if (username === "demo") {
        email = "demo@blogit.dev";
      } else {
        throw new Error("Username not found.");
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!usernameSnap.exists() && username === "demo") {
        await setDoc(doc(db, "usernames", username), {
          uid: cred.user.uid,
          email,
          username: "@demo"
        });
        await setDoc(doc(db, "users", cred.user.uid), { username: "@demo" }, { merge: true });
        await updateProfile(cred.user, { displayName: "@demo" });
      }
      window.location.href = "dashboard.html";
    } catch (err) {
      alert(err.message || "Unable to log in.");
    }
  });
}

const sampleBtn = document.getElementById("sample-btn");
if (sampleBtn) {
  sampleBtn.addEventListener("click", () => {
    document.getElementById("username").value = "@demo";
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

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editTitle = document.getElementById("edit-title");
const editContent = document.getElementById("edit-content");
const closeEditModal = document.getElementById("close-edit-modal");
const cancelEdit = document.getElementById("cancel-edit");
let editingPostId = null;

function closeEditDialog() {
  editModal.hidden = true;
  editingPostId = null;
}

if (closeEditModal) closeEditModal.addEventListener("click", closeEditDialog);
if (cancelEdit) cancelEdit.addEventListener("click", closeEditDialog);

async function loadPosts() {
  const postContainer = document.getElementById("posts");
  if (!postContainer) return;

  postContainer.innerHTML = "";

  try {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      loadedPosts = [];
      postContainer.innerHTML = "<p>No posts yet.</p>";
      return;
    }

    loadedPosts = snapshot.docs.map(postDoc => ({ id: postDoc.id, ...postDoc.data() }));
    snapshot.forEach(postDoc => {
      const data = postDoc.data();
      const cachedPost = loadedPosts.find(post => post.id === postDoc.id);
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
      const authorLink = document.createElement("button");
      authorLink.type = "button";
      authorLink.className = "author-link";
      authorLink.textContent = data.author || "Anonymous";
      authorLink.addEventListener("click", () => openProfile(data.userId, data.author, false));
      metadata.append("Posted by ", authorLink, ` on ${date}`);
      const metadataRow = document.createElement("div");
      metadataRow.className = "post-meta-row";
      metadataRow.appendChild(metadata);

      div.append(title, content, metadataRow);

      const user = auth.currentUser;
      const likedBy = Array.isArray(cachedPost.likedBy) ? cachedPost.likedBy : [];
      cachedPost.likedBy = likedBy;
      const likeButton = document.createElement("button");
      likeButton.type = "button";
      likeButton.className = "post-like btn btn-sm btn-outline-primary";
      likeButton.textContent = `${likedBy.includes(user?.uid) ? "Unlike" : "Like"} (${likedBy.length})`;
      let likePending = false;
      likeButton.addEventListener("click", async () => {
        if (!user) return alert("You must be logged in to like a post.");
        if (likePending) return;

        const wasLiked = likedBy.includes(user.uid);
        const previousLabel = likeButton.textContent;
        const nextCount = likedBy.length + (wasLiked ? -1 : 1);
        likePending = true;

        if (wasLiked) {
          likedBy.splice(likedBy.indexOf(user.uid), 1);
        } else {
          likedBy.push(user.uid);
        }
        likeButton.textContent = `${wasLiked ? "Like" : "Unlike"} (${nextCount})`;

        try {
          await updateDoc(doc(db, "posts", postDoc.id), {
            likedBy: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
          });
        } catch (error) {
          console.error("Error updating like:", error);
          if (wasLiked) {
            likedBy.push(user.uid);
          } else {
            likedBy.splice(likedBy.indexOf(user.uid), 1);
          }
          likeButton.textContent = previousLabel;
          alert(firestoreErrorMessage(error, "updating this like"));
        } finally {
          likePending = false;
        }
      });

      metadataRow.appendChild(likeButton);
      const savedBy = Array.isArray(cachedPost.savedBy) ? cachedPost.savedBy : [];
      cachedPost.savedBy = savedBy;
      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "post-save";
      saveButton.setAttribute("aria-label", savedBy.includes(user?.uid) ? "Remove saved post" : "Save post");
      saveButton.title = savedBy.includes(user?.uid) ? "Remove saved post" : "Save post";
      saveButton.innerHTML = `<i class="bi ${savedBy.includes(user?.uid) ? "bi-bookmark-fill" : "bi-bookmark"}" aria-hidden="true"></i>`;
      let savePending = false;
      saveButton.addEventListener("click", async () => {
        if (!user || savePending) return;
        const wasSaved = savedBy.includes(user.uid);
        savePending = true;
        if (wasSaved) {
          savedBy.splice(savedBy.indexOf(user.uid), 1);
        } else {
          savedBy.push(user.uid);
        }
        saveButton.classList.toggle("is-saved", !wasSaved);
        saveButton.setAttribute("aria-label", wasSaved ? "Save post" : "Remove saved post");
        saveButton.title = wasSaved ? "Save post" : "Remove saved post";
        saveButton.innerHTML = `<i class="bi ${wasSaved ? "bi-bookmark" : "bi-bookmark-fill"}" aria-hidden="true"></i>`;
        renderProfilePosts();

        try {
          await updateDoc(doc(db, "posts", postDoc.id), {
            savedBy: wasSaved ? arrayRemove(user.uid) : arrayUnion(user.uid)
          });
        } catch (error) {
          if (wasSaved) savedBy.push(user.uid);
          else savedBy.splice(savedBy.indexOf(user.uid), 1);
          saveButton.classList.toggle("is-saved", wasSaved);
          saveButton.setAttribute("aria-label", wasSaved ? "Remove saved post" : "Save post");
          saveButton.title = wasSaved ? "Remove saved post" : "Save post";
          saveButton.innerHTML = `<i class="bi ${wasSaved ? "bi-bookmark-fill" : "bi-bookmark"}" aria-hidden="true"></i>`;
          renderProfilePosts();
          alert(firestoreErrorMessage(error, "saving this post"));
        } finally {
          savePending = false;
        }
      });
      if (savedBy.includes(user?.uid)) saveButton.classList.add("is-saved");
      metadataRow.appendChild(saveButton);
        const commentsSection = document.createElement("section");
        commentsSection.className = "comments-section";
        const commentsToggle = document.createElement("button");
        commentsToggle.type = "button";
        commentsToggle.className = "comments-toggle";
        commentsToggle.textContent = "Show more comments";
        commentsToggle.hidden = true;
        const commentsList = document.createElement("div");
        commentsList.className = "comments-list";
        const commentForm = document.createElement("form");
        commentForm.className = "comment-form";
        const commentInput = document.createElement("input");
        commentInput.type = "text";
        commentInput.className = "form-control";
        commentInput.placeholder = "Add a thoughtful comment...";
        commentInput.maxLength = 500;
        commentInput.required = true;
        const commentSubmit = document.createElement("button");
        commentSubmit.type = "submit";
        commentSubmit.className = "btn btn-sm btn-primary";
        commentSubmit.textContent = "Comment";
        commentForm.append(commentInput, commentSubmit);
        let comments = [];
        let showAllComments = false;

        function renderComments() {
          commentsList.replaceChildren();
          const visibleComments = showAllComments ? comments : comments.slice(0, 3);

          if (!visibleComments.length) {
            const emptyState = document.createElement("small");
            emptyState.className = "comments-empty";
            emptyState.textContent = "No comments yet.";
            commentsList.appendChild(emptyState);
          } else {
            visibleComments.forEach(comment => {
              const commentRow = document.createElement("div");
              commentRow.className = "comment-row";
              const commentItem = document.createElement("p");
              commentItem.className = "comment-item";
              commentItem.textContent = `${comment.author || "Reader"}: ${comment.content}`;
              commentRow.appendChild(commentItem);

              const canDelete = user && (comment.userId === user.uid || data.userId === user.uid);
              if (canDelete) {
                const deleteCommentButton = document.createElement("button");
                deleteCommentButton.type = "button";
                deleteCommentButton.className = "comment-delete";
                deleteCommentButton.textContent = "Delete";
                deleteCommentButton.addEventListener("click", async () => {
                  try {
                    await deleteDoc(doc(db, "posts", postDoc.id, "comments", comment.id));
                    await loadComments();
                  } catch (error) {
                    console.error("Error deleting comment:", error);
                    alert(firestoreErrorMessage(error, "deleting this comment"));
                  }
                });
                commentRow.appendChild(deleteCommentButton);
              }

              commentsList.appendChild(commentRow);
            });
          }

          commentsToggle.hidden = comments.length <= 3;
          commentsToggle.textContent = showAllComments ? "Show fewer comments" : "Show more comments";
        }

        async function loadComments() {
          try {
            const commentsQuery = query(
              collection(db, "posts", postDoc.id, "comments"),
              orderBy("timestamp", "asc")
            );
            const commentsSnapshot = await getDocs(commentsQuery);
            comments = commentsSnapshot.docs.map(commentDoc => ({
              id: commentDoc.id,
              ...commentDoc.data()
            }));
            renderComments();
          } catch (error) {
            console.error("Error loading comments:", error);
            commentsList.textContent = firestoreErrorMessage(error, "loading comments");
          }
        }

        commentsToggle.addEventListener("click", () => {
          showAllComments = !showAllComments;
          renderComments();
        });

        commentForm.addEventListener("submit", async event => {
          event.preventDefault();
          const comment = commentInput.value.trim();
          if (!comment || !user) return;

          commentSubmit.disabled = true;
          try {
            await addDoc(collection(db, "posts", postDoc.id, "comments"), {
              content: comment,
              userId: user.uid,
              author: await getAccountName(user),
              timestamp: Timestamp.now()
            });
            commentInput.value = "";
            await loadComments();
          } catch (error) {
            console.error("Error adding comment:", error);
            alert(firestoreErrorMessage(error, "adding this comment"));
          } finally {
            commentSubmit.disabled = false;
          }
        });

        commentsSection.append(commentsToggle, commentsList, commentForm);
        loadComments();

      if (user && data.userId === user.uid) {
        const socialActions = document.createElement("div");
        socialActions.className = "post-actions";
        const menu = document.createElement("div");
        menu.className = "post-menu";

        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.className = "post-menu-toggle";
        menuButton.setAttribute("aria-label", "Post actions");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.title = "Post actions";
        menuButton.textContent = "\u22ee";

        const menuList = document.createElement("div");
        menuList.className = "post-menu-list";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "post-menu-item";
        editButton.textContent = "Edit post";
        editButton.addEventListener("click", () => {
          menu.classList.remove("is-open");
          menuButton.setAttribute("aria-expanded", "false");
          editingPostId = postDoc.id;
          editTitle.value = data.title || "";
          editContent.value = data.content || "";
          editModal.hidden = false;
          editTitle.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "post-menu-item post-menu-delete";
        deleteButton.textContent = "Delete post";
        deleteButton.addEventListener("click", async () => {
          menu.classList.remove("is-open");
          menuButton.setAttribute("aria-expanded", "false");
          if (!confirm("Delete this post permanently?")) return;

          try {
            await deleteDoc(doc(db, "posts", postDoc.id));
            await loadPosts();
          } catch (error) {
            console.error("Error deleting post:", error);
            alert(firestoreErrorMessage(error, "deleting this post"));
          }
        });

        menuButton.addEventListener("click", () => {
          const isOpen = menu.classList.toggle("is-open");
          menuButton.setAttribute("aria-expanded", String(isOpen));
        });

        menuList.append(editButton, deleteButton);
        menu.append(menuButton, menuList);
        socialActions.appendChild(menu);
        div.appendChild(socialActions);
      }

        div.appendChild(commentsSection);
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

if (editForm) {
  editForm.addEventListener("submit", async event => {
    event.preventDefault();
    const newTitle = editTitle.value.trim();
    const newContent = editContent.value.trim();
    if (!editingPostId || !newTitle || !newContent) return;

    const saveButton = editForm.querySelector("button[type='submit']");
    saveButton.disabled = true;
    try {
      await updateDoc(doc(db, "posts", editingPostId), {
        title: newTitle,
        content: newContent
      });
      closeEditDialog();
      await loadPosts();
    } catch (error) {
      console.error("Error editing post:", error);
      alert(firestoreErrorMessage(error, "editing this post"));
    } finally {
      saveButton.disabled = false;
    }
  });
}

const samplePostBtn = document.getElementById("sample-post-btn");
if (samplePostBtn) {
  const fallbackQuotes = [
    { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { quote: "It is never too late to be what you might have been.", author: "George Eliot" },
    { quote: "There is no charm equal to tenderness of heart.", author: "Jane Austen" }
  ];

  samplePostBtn.addEventListener("click", async () => {
    const originalLabel = samplePostBtn.textContent;
    samplePostBtn.disabled = true;
    samplePostBtn.textContent = "Finding a thought...";

    try {
      const response = await fetch("https://dummyjson.com/quotes/random");
      if (!response.ok) throw new Error("Quote service unavailable");
      const quote = await response.json();
      document.getElementById("title").value = `A thought from ${quote.author}`;
      document.getElementById("content").value = quote.quote;
    } catch (error) {
      const quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      document.getElementById("title").value = `A thought from ${quote.author}`;
      document.getElementById("content").value = quote.quote;
      console.warn("Using a local sample quote:", error);
    } finally {
      samplePostBtn.disabled = false;
      samplePostBtn.textContent = originalLabel;
    }
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

