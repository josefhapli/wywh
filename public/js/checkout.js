import {
  buildOrder,
  getDraft,
  renderDraftPreview,
  saveOrder,
  validateDraft,
  wireMobileActive
} from "./app-state.js";

import { functions } from "./firebase.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";
import { getPromotion, POSTCARD_PRICE_CENTS } from "./promo.js";

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
let activePromotion = null;

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
}

function applyPromotion() {
  const enteredCode = promoCodeInput.value;
  activePromotion = getPromotion(enteredCode);

  if (!activePromotion) {
    promoNotice.textContent = enteredCode.trim()
      ? "That promo code is not valid."
      : "Enter a promo code to apply it.";
    renderPricing();
    return;
  }

  promoCodeInput.value = activePromotion.code;
  promoNotice.textContent = activePromotion.description;
  renderPricing();
}

applyPromoButton?.addEventListener("click", applyPromotion);
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
          image: draft.image
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
