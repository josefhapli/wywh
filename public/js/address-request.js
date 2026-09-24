import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";
import { auth, functions } from "./firebase.js";

function callableError(error, fallback) {
  const message = error?.message?.replace(/^Firebase:\s*/, "").replace(/\s*\(functions\/[^)]+\)\.?$/, "");
  return new Error(message || fallback);
}

export async function continueWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: "select_account"});
    const result = await signInWithPopup(auth, provider);
    return {
      displayName: result.user.displayName || "",
      email: result.user.email || "",
    };
  } catch (error) {
    throw callableError(error, "We couldn't verify with Google.");
  }
}

export async function sendEmailCode(email) {
  try {
    const sendCode = httpsCallable(functions, "sendSenderVerificationCode");
    const response = await sendCode({email});
    return response.data;
  } catch (error) {
    throw callableError(error, "We couldn't send the verification code.");
  }
}

export async function verifyEmailCode(verificationId, code) {
  try {
    const verifyCode = httpsCallable(functions, "verifySenderEmailCode");
    const response = await verifyCode({verificationId, code});
    return response.data;
  } catch (error) {
    throw callableError(error, "We couldn't verify that code.");
  }
}

export async function emailAddressRequest(details, verification = {}) {
  try {
    const createRequest = httpsCallable(functions, "createAddressRequest");
    const response = await createRequest({...details, ...verification});
    return response.data;
  } catch (error) {
    throw callableError(error, "We couldn't email the address request.");
  }
}

export async function claimAddressRequest(requestId, claimToken) {
  try {
    const claimRequest = httpsCallable(functions, "claimAddressRequest");
    const response = await claimRequest({requestId, claimToken});
    return response.data;
  } catch (error) {
    throw callableError(error, "We couldn't resume this postcard.");
  }
}
