import { saveDraft, getDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";

wireMobileActive();

const input = document.querySelector("#photoUpload");
const uploadCard = document.querySelector(".upload-card");
const continueLink = document.querySelector("[data-continue]");
const uploadStatus = document.querySelector("#uploadStatus");
const maxDimension = 1600;
const maxDataUrlLength = 600000;

renderDraftPreview(document, getDraft());

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That image could not be opened."));
    });
    image.src = objectUrl;
  });
}

function compressImage(image) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const largestSide = Math.max(width, height);

  if (largestSide > maxDimension) {
    const scale = maxDimension / largestSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    for (let quality = 0.84; quality >= 0.44; quality -= 0.1) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= maxDataUrlLength) return dataUrl;
    }

    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }

  throw new Error("Try a different photo with a little less detail.");
}

async function readFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  uploadStatus.textContent = "Preparing your photo...";

  try {
    const image = await loadImage(file);
    saveDraft({ image: compressImage(image) });
    renderDraftPreview(document);
    continueLink?.classList.remove("hidden");
    uploadStatus.textContent = "Photo ready for your postcard.";
  } catch (error) {
    console.error("Error preparing photo:", error);
    uploadStatus.textContent = error.message;
  }
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
