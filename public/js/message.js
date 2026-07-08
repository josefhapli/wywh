import { getDraft, saveDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";

wireMobileActive();

const form = document.querySelector("#messageForm");
const draft = getDraft();

Object.entries(draft).forEach(([key, value]) => {
  const field = form?.elements[key];
  if (field) field.value = value;
});

renderDraftPreview(document, draft);

form?.addEventListener("input", () => {
  const data = Object.fromEntries(new FormData(form));
  saveDraft(data);
  renderDraftPreview(document);
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  saveDraft(data);
  window.location.href = "preview.html";
});
