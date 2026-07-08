import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";

export function createAuthService(auth) {
  async function registerWithEmail(email, password, displayName = "") {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    return credential.user;
  }

  async function loginWithEmail(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  }

  function watchAuthState(callback) {
    return onAuthStateChanged(auth, callback);
  }

  function currentUser() {
    return auth.currentUser;
  }

  async function logout() {
    await signOut(auth);
  }

  return {
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    watchAuthState,
    currentUser,
    logout
  };
}

