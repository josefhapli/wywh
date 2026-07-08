import { createOrder, getDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";

wireMobileActive();
renderDraftPreview(document, getDraft());

document.querySelector("#checkout")?.addEventListener("click", () => {
  createOrder();
  window.location.href = "success.html";
});
