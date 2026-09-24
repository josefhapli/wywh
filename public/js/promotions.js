import {auth, functions} from "./firebase.js";
import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {httpsCallable} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";

const gate = document.querySelector("[data-gate]");
const dashboard = document.querySelector("[data-dashboard]");
const notice = document.querySelector("[data-notice]");
const formNotice = document.querySelector("[data-form-notice]");
const form = document.querySelector("[data-promotion-form]");
const list = document.querySelector("[data-promotion-list]");
const listPromotions = httpsCallable(functions, "listPromotions");
const savePromotion = httpsCallable(functions, "savePromotion");
const provider = new GoogleAuthProvider();
let promotions = [];

const localDate = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
const serverDate = (value) => value ? new Date(value).toISOString() : null;

function resetForm() {
  form.reset();
  document.querySelector("#promotionActive").checked = true;
  document.querySelector("#promotionCode").disabled = false;
  document.querySelector("#startsAt").value = localDate(new Date().toISOString());
  document.querySelector("[data-form-title]").textContent = "New promotion";
  formNotice.textContent = "";
}

function editPromotion(promotion) {
  document.querySelector("#promotionCode").value = promotion.code;
  document.querySelector("#promotionCode").disabled = true;
  document.querySelector("#discountType").value = promotion.discountType;
  document.querySelector("#discountValue").value = promotion.discountValue;
  document.querySelector("#startsAt").value = localDate(promotion.startsAt);
  document.querySelector("#endsAt").value = localDate(promotion.endsAt);
  document.querySelector("#redemptionLimit").value = promotion.redemptionLimit ?? "";
  document.querySelector("#promotionActive").checked = promotion.active;
  document.querySelector("[data-form-title]").textContent = `Edit ${promotion.code}`;
  window.scrollTo({top: 0, behavior: "smooth"});
}

function renderPromotions() {
  list.replaceChildren();
  if (!promotions.length) {
    list.textContent = "No promotions yet.";
    return;
  }
  promotions.forEach((promotion) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promotion-card";
    const value = promotion.discountType === "percentage" ? `${promotion.discountValue}% off` : `$${(promotion.discountValue / 100).toFixed(2)} off`;
    const usage = promotion.redemptionLimit === null ? `${promotion.redemptionCount} used` : `${promotion.redemptionCount} / ${promotion.redemptionLimit} used`;
    const reserved = promotion.reservationCount ? ` · ${promotion.reservationCount} reserved` : "";
    button.innerHTML = `<strong>${promotion.code}</strong><span>${value}</span><span>${usage}${reserved} · ${promotion.active ? "active" : "inactive"}</span>`;
    button.addEventListener("click", () => editPromotion(promotion));
    list.append(button);
  });
}

async function loadPromotions() {
  const result = await listPromotions();
  promotions = result.data.promotions;
  renderPromotions();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formNotice.textContent = "Saving…";
  try {
    await savePromotion({
      code: document.querySelector("#promotionCode").value,
      discountType: document.querySelector("#discountType").value,
      discountValue: Number(document.querySelector("#discountValue").value),
      startsAt: serverDate(document.querySelector("#startsAt").value),
      endsAt: serverDate(document.querySelector("#endsAt").value),
      redemptionLimit: document.querySelector("#redemptionLimit").value,
      active: document.querySelector("#promotionActive").checked,
    });
    resetForm();
    formNotice.textContent = "Promotion saved.";
    await loadPromotions();
  } catch (error) {
    console.error("Unable to save promotion", error);
    formNotice.textContent = error.message || "We couldn't save that promotion.";
  }
});

document.querySelector("[data-reset]").addEventListener("click", resetForm);
document.querySelector("[data-sign-in]").addEventListener("click", () => signInWithPopup(auth, provider));
document.querySelector("[data-sign-out]").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) { gate.hidden = false; dashboard.hidden = true; return; }
  try {
    await user.getIdToken(true);
    document.querySelector("[data-operator-email]").textContent = user.email || "";
    await loadPromotions();
    gate.hidden = true; dashboard.hidden = false; resetForm();
  } catch (error) {
    console.error("Operator access denied", error);
    notice.textContent = "This Google account is not approved for WYWH promotions.";
    await signOut(auth);
  }
});
