import { wireMobileActive } from "./app-state.js";

wireMobileActive();

document.querySelector("#authForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  window.location.href = "create.html";
});
