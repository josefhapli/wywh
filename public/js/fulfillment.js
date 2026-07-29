import { auth, functions } from "./firebase.js";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";

const gate = document.querySelector("[data-gate]");
const dashboard = document.querySelector("[data-dashboard]");
const gateNotice = document.querySelector("[data-gate-notice]");
const ordersList = document.querySelector("[data-orders-list]");
const orderDetail = document.querySelector("[data-order-detail]");
const detailNotice = document.querySelector("[data-detail-notice]");
const operatorEmail = document.querySelector("[data-operator-email]");
const selectedOrderId = document.querySelector("[data-selected-order-id]");
const provider = new GoogleAuthProvider();
let activeOrder = null;
const QR_MODULES = [
  "111111101100111110100111001111111",
  "100000100010111000111010101000001",
  "101110100100101011111110001011101",
  "101110101011000011010111001011101",
  "101110101110110011010001001011101",
  "100000101110110101001100001000001",
  "111111101010101010101010101111111",
  "000000001011001001011101100000000",
  "100010111101000101001111011111001",
  "001101010001001111101111010001110",
  "001100111010111100101001111001000",
  "000001011010110000010011111000011",
  "010000100010110110010010101011011",
  "011100001100101000111001000001000",
  "100000111111010101101101011110110",
  "111111000010000111100111111100000",
  "001111110001011001010110101011010",
  "101001001000011110000011010001100",
  "000110101000001111001111000101010",
  "111101001001010011111101010100000",
  "110011111101100000101001011011001",
  "100101001110101010010011010101110",
  "001110110001001011110101010000110",
  "001011011100010001011101010010010",
  "110111100001101111101111111111000",
  "000000001110100111100100100010100",
  "111111101011111110101000101011010",
  "100000100011010110000010100010011",
  "101110101101111010000010111111011",
  "101110100101001001111000101110010",
  "101110100011000100101100011110000",
  "100000100101000111100111111000000",
  "111111101100110011011111110001001",
];

const listFulfillmentOrders = httpsCallable(functions, "listFulfillmentOrders");
const getFulfillmentOrder = httpsCallable(functions, "getFulfillmentOrder");
const updateFulfillmentStatus = httpsCallable(functions, "updateFulfillmentStatus");
const dateFormatter = new Intl.DateTimeFormat(undefined, {month: "short", day: "numeric"});

function renderQrCode() {
  const svg = document.querySelector("[data-qr-code]");
  if (!svg) return;

  const namespace = "http://www.w3.org/2000/svg";
  svg.setAttribute("viewBox", "-4 -4 41 41");
  const background = document.createElementNS(namespace, "rect");
  background.setAttribute("x", "-4");
  background.setAttribute("y", "-4");
  background.setAttribute("width", "41");
  background.setAttribute("height", "41");
  background.setAttribute("fill", "white");
  svg.append(background);

  QR_MODULES.forEach((row, y) => {
    [...row].forEach((module, x) => {
      if (module !== "1") return;
      const square = document.createElementNS(namespace, "rect");
      square.setAttribute("x", x);
      square.setAttribute("y", y);
      square.setAttribute("width", "1");
      square.setAttribute("height", "1");
      square.setAttribute("fill", "black");
      svg.append(square);
    });
  });
}

renderQrCode();

function setGateNotice(message = "") {
  gateNotice.textContent = message;
}

function renderOrders(orders) {
  ordersList.replaceChildren();
  if (!orders.length) {
    const empty = document.createElement("p");
    empty.textContent = "No paid orders are waiting right now.";
    ordersList.append(empty);
    return;
  }

  orders.forEach((order) => {
    const button = document.createElement("button");
    button.className = "fulfillment-order";
    button.type = "button";
    button.dataset.orderId = order.orderId;
    const title = document.createElement("strong");
    title.textContent = order.orderId;
    const recipient = document.createElement("span");
    recipient.textContent = `To ${order.recipientName}`;
    const status = document.createElement("span");
    const date = order.createdAt ? ` · ${dateFormatter.format(new Date(order.createdAt))}` : "";
    status.textContent = `${order.fulfillmentStatus}${date}`;
    button.append(title, recipient, status);
    button.addEventListener("click", () => loadOrder(order.orderId));
    ordersList.append(button);
  });
}

async function loadOrders() {
  const result = await listFulfillmentOrders();
  renderOrders(result.data.orders);
}

function showOrder(order) {
  activeOrder = order;
  selectedOrderId.textContent = order.orderId;
  document.querySelector("[data-order-image]").src = order.memory.image;
  document.querySelector("[data-order-message]").textContent = order.memory.message;
  document.querySelector("[data-order-recipient]").textContent = order.recipient.name;
  document.querySelector("[data-order-address]").textContent = [
    order.recipient.address,
    `${order.recipient.city}, ${order.recipient.state} ${order.recipient.zip}`,
  ].join("\n");
  detailNotice.textContent = "";
  orderDetail.hidden = false;
}

async function loadOrder(orderId) {
  try {
    const result = await getFulfillmentOrder({orderId});
    showOrder(result.data);
  } catch (error) {
    console.error("Unable to load order", error);
    detailNotice.textContent = "We couldn't load that order. Please try again.";
  }
}

async function startDashboard(user) {
  try {
    await user.getIdToken(true);
    operatorEmail.textContent = user.email || "";
    gate.hidden = true;
    dashboard.hidden = false;
    await loadOrders();
  } catch (error) {
    console.error("Operator access denied", error);
    await signOut(auth);
    setGateNotice("This Google account is not approved for WYWH fulfillment.");
  }
}

document.querySelector("[data-sign-in]").addEventListener("click", async () => {
  setGateNotice("");
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google sign-in failed", error);
    setGateNotice("Google sign-in didn't finish. Please try again.");
  }
});

document.querySelector("[data-sign-out]").addEventListener("click", () => signOut(auth));

window.addEventListener("afterprint", () => {
  delete document.body.dataset.printingSide;
});

document.querySelectorAll("[data-print-side]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!activeOrder) return;
    document.body.dataset.printingSide = button.dataset.printSide;
    window.print();
  });
});

document.querySelectorAll("[data-status]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!activeOrder) return;
    detailNotice.textContent = "Updating order…";
    try {
      const result = await updateFulfillmentStatus({
        orderId: activeOrder.orderId,
        fulfillmentStatus: button.dataset.status,
      });
      activeOrder.fulfillmentStatus = result.data.fulfillmentStatus;
      detailNotice.textContent = `Marked ${result.data.fulfillmentStatus}.`;
      await loadOrders();
    } catch (error) {
      console.error("Unable to update order", error);
      detailNotice.textContent = "We couldn't update that order. Please try again.";
    }
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    startDashboard(user);
  } else {
    dashboard.hidden = true;
    orderDetail.hidden = true;
    gate.hidden = false;
  }
});
