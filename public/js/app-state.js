const STORAGE_KEY = "wywh.postcard";
const ORDERS_KEY = "wywh.orders";
const DEFAULT_IMAGE = "images/postcard-hero.png";

export function getDraft() {
  const fallback = {
    image: DEFAULT_IMAGE,
    message: "Wish you were here.",
    recipient: "",
    address: "",
    city: "",
    state: "",
    zip: ""
  };

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

export function saveDraft(update) {
  const draft = { ...getDraft(), ...update };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createOrder() {
  const draft = getDraft();
  const order = {
    id: `WYWH-${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString(),
    status: "Queued for Printing",
    statusClass: "queued",
    image: draft.image,
    recipient: draft.recipient || "Recipient"
  };
  const orders = [order, ...getOrders()];
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 12)));
  sessionStorage.setItem("wywh.lastOrder", JSON.stringify(order));
  return order;
}

export function getLastOrder() {
  try {
    return JSON.parse(sessionStorage.getItem("wywh.lastOrder") || "null");
  } catch {
    return null;
  }
}

export function getOrders() {
  try {
    const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (existing.length) return existing;
  } catch {
    return [];
  }

  return [
    {
      id: "WYWH-1234",
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      status: "Mailed",
      statusClass: "mailed",
      image: DEFAULT_IMAGE,
      recipient: "Avery Stone"
    },
    {
      id: "WYWH-1235",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: "In Production",
      statusClass: "printing",
      image: DEFAULT_IMAGE,
      recipient: "Morgan Lee"
    }
  ];
}

export function renderDraftPreview(root, draft = getDraft()) {
  if (!root) return;
  root.querySelectorAll("[data-preview-image]").forEach((img) => {
    img.src = draft.image || DEFAULT_IMAGE;
  });
  root.querySelectorAll("[data-preview-message]").forEach((el) => {
    el.textContent = draft.message || "Wish you were here.";
  });
  root.querySelectorAll("[data-preview-recipient]").forEach((el) => {
    el.textContent = draft.recipient || "Recipient Name";
  });
  root.querySelectorAll("[data-preview-address]").forEach((el) => {
    const cityLine = [draft.city, draft.state, draft.zip].filter(Boolean).join(", ");
    el.textContent = [draft.address, cityLine].filter(Boolean).join("\n") || "Street Address\nCity, State ZIP";
  });
}

export function wireMobileActive() {
  const page = document.body.dataset.page;
  document.querySelectorAll(`[data-nav="${page}"]`).forEach((link) => {
    link.classList.add("active");
  });
}
