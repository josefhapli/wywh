import { getOrders, wireMobileActive } from "./app-state.js";

wireMobileActive();

const list = document.querySelector("#ordersList");
const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

if (list) {
  list.innerHTML = getOrders().map((order) => `
    <article class="order-card">
      <div class="order-thumb"><img src="${order.image}" alt=""></div>
      <div>
        <h3>${order.id}</h3>
        <p>To ${order.recipient} - ${formatter.format(new Date(order.createdAt))}</p>
      </div>
      <div class="status ${order.statusClass}">${order.status}</div>
    </article>
  `).join("");
}
