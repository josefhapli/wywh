import {
  buildOrder,
  getDraft,
  renderDraftPreview,
  saveDraft,
  saveOrder,
  validateDraft,
  wireMobileActive
} from "./app-state.js?v=20260730-stacked-preview";

import { functions } from "./firebase.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";
const POSTCARD_PRICE_CENTS = 299;

wireMobileActive();
renderDraftPreview(document, getDraft());

const checkoutButton = document.querySelector("#checkout");
const checkoutNotice = document.querySelector("#checkoutNotice");
const promoCodeInput = document.querySelector("#promoCode");
const applyPromoButton = document.querySelector("#applyPromo");
const promoNotice = document.querySelector("#promoNotice");
const subtotal = document.querySelector("[data-subtotal]");
const discountRow = document.querySelector("[data-discount-row]");
const discount = document.querySelector("[data-discount]");
const total = document.querySelector("[data-total]");
const senderName = document.querySelector("#senderName");
const differentReturnAddress = document.querySelector("#differentReturnAddress");
const returnFields = document.querySelector("[data-return-fields]");
const returnPreview = document.querySelector("[data-preview-return]");
const returnInputs = ["returnAddress", "returnAddress2", "returnCity", "returnState", "returnZip"]
  .map((id) => document.querySelector(`#${id}`));
let activePromotion = null;
let userSelectedDifferentReturn = getDraft().returnAddressSource === "separate";

const formatUsd = (cents) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
}).format(cents / 100);

function renderPricing() {
  const discountCents = activePromotion?.discountCents || 0;
  const totalCents = activePromotion?.totalCents ?? POSTCARD_PRICE_CENTS;
  subtotal.textContent = formatUsd(POSTCARD_PRICE_CENTS);
  discountRow.hidden = discountCents === 0;
  discount.textContent = `-${formatUsd(discountCents)}`;
  total.textContent = formatUsd(totalCents);
  checkoutButton.textContent = totalCents === 0
    ? "Place Free Postcard Order"
    : `Pay ${formatUsd(totalCents)}`;
  checkoutNotice.textContent = totalCents === 0
    ? "Your promo code covers the full postcard price."
    : "You'll enter your card details securely on Stripe.";
  renderReturnAddressMode();
}

function returnAddress() {
  return {
    address: document.querySelector("#returnAddress").value.trim(),
    address2: document.querySelector("#returnAddress2").value.trim(),
    city: document.querySelector("#returnCity").value.trim(),
    state: document.querySelector("#returnState").value.trim(),
    zip: document.querySelector("#returnZip").value.trim(),
    country: "US"
  };
}

function renderReturnPreview() {
  if (returnFields.hidden) {
    returnPreview.textContent = `From: ${senderName.value.trim() || "Sender"}\nBilling address added after payment`;
    return;
  }
  const address = returnAddress();
  const locality = [address.city, address.state].filter(Boolean).join(", ");
  returnPreview.textContent = [
    `From: ${senderName.value.trim() || "Sender"}`,
    address.address,
    address.address2,
    [locality, address.zip].filter(Boolean).join(" ")
  ].filter(Boolean).join("\n");
}

function renderReturnAddressMode() {
  const isFree = (activePromotion?.totalCents ?? POSTCARD_PRICE_CENTS) === 0;
  differentReturnAddress.disabled = isFree;
  differentReturnAddress.checked = isFree || userSelectedDifferentReturn;
  returnFields.hidden = !differentReturnAddress.checked;
  returnInputs.forEach((input) => { input.required = !returnFields.hidden && input.id !== "returnAddress2"; });
  renderReturnPreview();
}

const initialDraft = getDraft();
senderName.value = initialDraft.senderName || "";
differentReturnAddress.checked = userSelectedDifferentReturn;
returnInputs.forEach((input) => { input.value = initialDraft[input.id] || ""; });
senderName.addEventListener("input", () => {
  saveDraft({senderName: senderName.value});
  renderReturnPreview();
});
differentReturnAddress.addEventListener("change", () => {
  userSelectedDifferentReturn = differentReturnAddress.checked;
  saveDraft({returnAddressSource: userSelectedDifferentReturn ? "separate" : "billing"});
  renderReturnAddressMode();
});
returnInputs.forEach((input) => input.addEventListener("input", () => {
  saveDraft({[input.id]: input.value});
  renderReturnPreview();
}));

async function applyPromotion() {
  const enteredCode = promoCodeInput.value;
  if (!enteredCode.trim()) {
    activePromotion = null;
    promoNotice.textContent = "Enter a promo code to apply it.";
    renderPricing();
    return;
  }
  applyPromoButton.disabled = true;
  promoNotice.textContent = "Checking promo code…";
  try {
    const validatePromotion = httpsCallable(functions, "validatePromotion");
    const result = await validatePromotion({code: enteredCode});
    activePromotion = result.data;
    promoCodeInput.value = activePromotion.code;
    promoNotice.textContent = `Promo applied — you save ${formatUsd(activePromotion.discountCents)}.`;
    renderPricing();
  } catch (error) {
    console.error("Unable to apply promotion", error);
    activePromotion = null;
    promoNotice.textContent = "That promo code is not currently available.";
    renderPricing();
  } finally {
    applyPromoButton.disabled = false;
  }
}

applyPromoButton?.addEventListener("click", applyPromotion);
promoCodeInput?.addEventListener("input", () => {
  if (activePromotion && promoCodeInput.value.trim().toUpperCase() !== activePromotion.code) {
    activePromotion = null;
    promoNotice.textContent = "Apply the updated code to recalculate your total.";
    renderPricing();
  }
});
promoCodeInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyPromotion();
  }
});

renderPricing();

checkoutButton?.addEventListener("click", async () => {
  const originalLabel = checkoutButton.textContent;
  const setCheckoutState = (isSubmitting, message = "") => {
    checkoutButton.disabled = isSubmitting;
    checkoutButton.textContent = isSubmitting ? "Placing your postcard..." : originalLabel;
    checkoutNotice.textContent = message;
  };

  const draft = getDraft();
  const missingFields = validateDraft(draft);

  if (missingFields.length) {
    checkoutNotice.textContent = `Add ${missingFields.join(", ")} before placing your order.`;
    return;
  }

  if (!senderName.value.trim()) {
    checkoutNotice.textContent = "Add your sender name before placing the order.";
    senderName.focus();
    return;
  }
  if (!returnFields.hidden && returnInputs.some((input) => input.required && !input.value.trim())) {
    checkoutNotice.textContent = "Complete your return mailing address before placing the order.";
    returnInputs.find((input) => input.required && !input.value.trim())?.focus();
    return;
  }

  setCheckoutState(true, "Saving your postcard order securely...");

  try {
    const createCheckout = httpsCallable(functions, "createCheckout");
    const result = await createCheckout({
      draft: {
        recipient: {
          name: draft.recipient,
          address: draft.address,
          city: draft.city,
          state: draft.state,
          zip: draft.zip
        },
        memory: {
          message: draft.message,
          image: draft.image,
          imageOrientation: draft.imageOrientation,
          imageSourceWidth: draft.imageSourceWidth,
          imageSourceHeight: draft.imageSourceHeight
        },
        sender: {
          name: senderName.value.trim(),
          returnAddressSource: returnFields.hidden ? "billing" : "separate",
          returnAddress: returnFields.hidden ? null : returnAddress()
        }
      },
      promoCode: activePromotion?.code || ""
    });

    if (result.data.mode === "promo") {
      saveOrder(buildOrder({id: result.data.orderId}));
      window.location.href = `success.html?order_id=${encodeURIComponent(result.data.orderId)}`;
      return;
    }

    if (result.data.mode === "payment" && result.data.checkoutUrl) {
      saveOrder(buildOrder({
        id: result.data.orderId,
        status: "Payment pending"
      }));
      window.location.assign(result.data.checkoutUrl);
      return;
    }

    throw new Error("Checkout did not return a payment destination.");
  } catch (error) {
    console.error("Error creating order:", error);
    setCheckoutState(false, "We couldn't start checkout. Please check your connection and try again.");
  }
});
