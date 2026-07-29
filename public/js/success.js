import { getLastOrder, wireMobileActive } from "./app-state.js";

wireMobileActive();

const order = getLastOrder();
const orderId = new URLSearchParams(window.location.search).get("order_id");

if (orderId) {
  document.querySelector("[data-order-id]").textContent = orderId;
  document.querySelector("[data-order-status]").textContent = "Payment received — confirming your order";
} else if (order) {
  document.querySelector("[data-order-id]").textContent = order.id;
  document.querySelector("[data-order-status]").textContent = order.status;
}
