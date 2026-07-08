import { getLastOrder, wireMobileActive } from "./app-state.js";

wireMobileActive();

const order = getLastOrder();

if (order) {
  document.querySelector("[data-order-id]").textContent = order.id;
  document.querySelector("[data-order-status]").textContent = order.status;
}
