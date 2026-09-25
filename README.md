# Blog-App

Firebase-powered blogging platform with email authentication and Firestore post storage.

## Run locally

Serve the `Blog-App` folder over HTTP because the Firebase modules are loaded as ES modules:

```powershell
cd Blog-App
python -m http.server 8000
```

Open `http://localhost:8000/index.html` in your browser.

## Sample login

Use these values to log in to the demo account:

- Username: `@demo`
- Password: `Blogit123!`

## Firebase setup

The Firebase project must have Email/Password sign-in enabled. The required Firestore rules are in [firestore.rules](firestore.rules). Copy them into **Firestore Database → Rules** in the Firebase Console and click **Publish**. These rules allow authenticated users to read posts, create their own posts, and read or update their own user profile.

