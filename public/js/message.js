import { getDraft, saveDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";

wireMobileActive();

const form = document.querySelector("#messageForm");
const draft = getDraft();
const messageField = form?.elements.message;
const characterCount = document.querySelector("[data-character-count]");

function updateCharacterCount() {
  if (messageField && characterCount) {
    characterCount.textContent = `${messageField.value.length} / ${messageField.maxLength}`;
  }
}

Object.entries(draft).forEach(([key, value]) => {
  const field = form?.elements[key];
  if (field) field.value = value;
});

renderDraftPreview(document, draft);
updateCharacterCount();

form?.addEventListener("input", () => {
  const data = Object.fromEntries(new FormData(form));
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
