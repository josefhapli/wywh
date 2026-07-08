import { saveDraft, getDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";

wireMobileActive();

const input = document.querySelector("#photoUpload");
const uploadCard = document.querySelector(".upload-card");
const continueLink = document.querySelector("[data-continue]");

renderDraftPreview(document, getDraft());

function readFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    saveDraft({ image: reader.result });
    renderDraftPreview(document);
    continueLink?.classList.remove("hidden");
  });
  reader.readAsDataURL(file);
}

input?.addEventListener("change", (event) => {
  readFile(event.target.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  uploadCard?.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadCard.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadCard?.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadCard.classList.remove("dragover");
  });
});

uploadCard?.addEventListener("drop", (event) => {
  readFile(event.dataTransfer.files[0]);
});
