// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
// import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// // Your Firebase config (replace with your own)
// const firebaseConfig = {
//   apiKey: 'AIzaSyAzjWGO-MvvFpz6TgNiEPgPjK5SEYH5EGQ',
//   authDomain: "blog-app-1c91c.firebaseapp.com",
//   projectId: "blog-app-1c91c",
//   storageBucket: "blog-app-1c91c.appspot.com",
//   messagingSenderId: "722022572280",
//   appId: "1:722022572280:web:758d6cae694206950a9b0d",
//   measurementId: "G-5093G58SHZ",
// };

// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// const signupBtn = document.getElementById("signup-btn");
// signupBtn.addEventListener("click", () => {
//   const email = document.getElementById("email").value.trim();
//   const password = document.getElementById("password").value.trim();

//   if (!email || !password) {
//     alert("Please enter both email and password.");
//     return;
//   }

//   createUserWithEmailAndPassword(auth, email, password)
//     .then(() => {
//       alert("Account created! Redirecting to home...");
//       window.location.href = "index.html";
//     })
//     .catch((error) => {
//       alert("Error: " + error.message);
//     });
// });
