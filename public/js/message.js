import { getDraft, saveDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";
import {
  claimAddressRequest,
  continueWithGoogle,
  emailAddressRequest,
  sendEmailCode,
  verifyEmailCode,
} from "./address-request.js";

wireMobileActive();

const form = document.querySelector("#messageForm");
const messageField = form?.elements.message;
const characterCount = document.querySelector("[data-character-count]");
const requestOpenButton = document.querySelector("[data-address-request-open]");
const requestPanel = document.querySelector("[data-address-request-panel]");
const googleButton = document.querySelector("[data-google-request]");
const sendCodeButton = document.querySelector("[data-send-code]");
const verifyButton = document.querySelector("[data-verify-request]");
const codePanel = document.querySelector("[data-verification-code]");
const requestStatus = document.querySelector("[data-address-request-status]");
let verificationId = "";

function setRequestStatus(message, isError = false) {
  if (!requestStatus) return;
  requestStatus.textContent = message;
  requestStatus.classList.toggle("error", isError);
}

function updateCharacterCount() {
  if (messageField && characterCount) {
    characterCount.textContent = `${messageField.value.length} / ${messageField.maxLength}`;
  }
}

function fillDraft(draft) {
  Object.entries(draft).forEach(([key, value]) => {
    const field = form?.elements[key];
    if (field) field.value = value;
  });
  renderDraftPreview(document, draft);
  updateCharacterCount();
}

function currentRequestDetails() {
  const draft = getDraft();
  const senderName = document.querySelector("#requestSenderName")?.value.trim() || "";
  const recipientEmail = document.querySelector("#requestRecipientEmail")?.value.trim() || "";
  const recognitionNote = document.querySelector("#requestRecognitionNote")?.value.trim() || "";
  const missing = [];
  if (!draft.image) missing.push("a photo");
  if (!draft.message?.trim()) missing.push("a message");
  if (!draft.recipient?.trim()) missing.push("the recipient's name");
  if (!senderName) missing.push("your name");
  if (!recipientEmail) missing.push("their email");
  if (missing.length) throw new Error(`Please add ${missing.join(", ")} first.`);
  return {
    senderName,
    recipientName: draft.recipient,
    recipientEmail,
    recognitionNote,
    draft: {
      image: draft.image,
      imageOrientation: draft.imageOrientation,
      imageSourceWidth: draft.imageSourceWidth,
      imageSourceHeight: draft.imageSourceHeight,
      message: draft.message
    },
  };
}

function showRequestSent(recipientEmail) {
  requestPanel.querySelectorAll("input, button").forEach((element) => {
    element.disabled = true;
  });
  setRequestStatus(`Request emailed to ${recipientEmail}. We'll email you when the address is ready.`);
}

async function createRequest(verification) {
  const details = currentRequestDetails();
  const result = await emailAddressRequest(details, verification);
  showRequestSent(details.recipientEmail);
  return result;
}

async function resumeFromEmail() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get("request");
  const claimToken = params.get("claim");
  if (!requestId || !claimToken) return;
  requestPanel.hidden = false;
  requestOpenButton.hidden = true;
  setRequestStatus("Securely restoring your postcard...");
  try {
    const result = await claimAddressRequest(requestId, claimToken);
    const restored = saveDraft(result.draft);
    fillDraft(restored);
    requestPanel.hidden = true;
    history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    setRequestStatus(error.message || "We couldn't resume this postcard.", true);
  }
}

fillDraft(getDraft());
resumeFromEmail();

requestOpenButton?.addEventListener("click", () => {
  requestPanel.hidden = false;
  requestOpenButton.hidden = true;
  document.querySelector("#requestSenderName")?.focus();
});

googleButton?.addEventListener("click", async () => {
  googleButton.disabled = true;
  setRequestStatus("Verifying with Google...");
  try {
    const identity = await continueWithGoogle();
    const senderName = document.querySelector("#requestSenderName");
    if (senderName && !senderName.value.trim()) senderName.value = identity.displayName;
    setRequestStatus("Verified. Emailing the request...");
    await createRequest();
  } catch (error) {
    setRequestStatus(error.message || "We couldn't verify with Google.", true);
    googleButton.disabled = false;
  }
});

sendCodeButton?.addEventListener("click", async () => {
  const email = document.querySelector("#requestSenderEmail")?.value.trim() || "";
  if (!email) {
    setRequestStatus("Enter your email first.", true);
    return;
  }
  sendCodeButton.disabled = true;
  setRequestStatus("Sending your verification code...");
  try {
    const result = await sendEmailCode(email);
    verificationId = result.verificationId;
    codePanel.hidden = false;
    setRequestStatus(`Enter the code sent to ${email}.`);
    document.querySelector("#requestCode")?.focus();
  } catch (error) {
    setRequestStatus(error.message || "We couldn't send the code.", true);
    sendCodeButton.disabled = false;
  }
});

verifyButton?.addEventListener("click", async () => {
  const code = document.querySelector("#requestCode")?.value.trim() || "";
  verifyButton.disabled = true;
  setRequestStatus("Verifying and emailing the request...");
  try {
    const result = await verifyEmailCode(verificationId, code);
    await createRequest({verificationId, proofToken: result.proofToken});
  } catch (error) {
    setRequestStatus(error.message || "We couldn't verify that code.", true);
    verifyButton.disabled = false;
  }
});

form?.addEventListener("input", () => {
  const draftFields = ["message", "recipient", "address", "city", "state", "zip"];
  const data = Object.fromEntries(draftFields.map((name) => [name, form.elements[name]?.value || ""]));
  saveDraft(data);
  renderDraftPreview(document);
  updateCharacterCount();
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  saveDraft(data);
  window.location.href = "preview.html";
});
