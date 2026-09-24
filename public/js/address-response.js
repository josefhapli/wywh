import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";
import { functions } from "./firebase.js";

const params = new URLSearchParams(window.location.search);
const requestId = params.get("request") || "";
const submitToken = params.get("token") || "";
const form = document.querySelector("#addressResponseForm");
const status = document.querySelector("[data-response-status]");
const heading = document.querySelector("[data-request-heading]");
const intro = document.querySelector("[data-request-intro]");
const trustPanel = document.querySelector("[data-request-trust]");
const senderIdentity = document.querySelector("[data-sender-identity]");
const recognitionNote = document.querySelector("[data-recognition-note]");

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function loadRequest() {
  if (!requestId || !submitToken) {
    showStatus("This private link is incomplete. Ask the sender for a new one.", true);
    return;
  }
  try {
    const getRequest = httpsCallable(functions, "getAddressRequest");
    const response = await getRequest({requestId, submitToken});
    const request = response.data;
    if (request.recipientName) {
      form.elements.name.value = request.recipientName;
      heading.textContent = `Hi ${request.recipientName} — where should we send it?`;
    }
    senderIdentity.textContent = `${request.senderName} (${request.senderEmail}) asked for your mailing address.`;
    if (request.recognitionNote) {
      recognitionNote.textContent = `“${request.recognitionNote}”`;
      recognitionNote.hidden = false;
    }
    trustPanel.hidden = false;
    form.hidden = false;
    showStatus("");
  } catch (error) {
    showStatus(error.message || "This private link is invalid or has expired.", true);
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  showStatus("Sharing securely...");
  try {
    const submitRequest = httpsCallable(functions, "submitAddressRequest");
    const address = Object.fromEntries(new FormData(form));
    await submitRequest({requestId, submitToken, address});
    form.hidden = true;
    heading.textContent = "Address shared";
    intro.textContent = "You're all set. The sender can now add your address to their postcard.";
    showStatus("You can close this page.");
    history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    showStatus(error.message || "We couldn't share your address. Please try again.", true);
    button.disabled = false;
  }
});

loadRequest();
