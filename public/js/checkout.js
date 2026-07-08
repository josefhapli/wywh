import {
  createOrder,
  getDraft,
  renderDraftPreview,
  wireMobileActive
} from "./app-state.js";

import { createOrderRecord } from "./firestore.js";

wireMobileActive();
renderDraftPreview(document, getDraft());

document.querySelector("#checkout")?.addEventListener("click", async () => {

  const draft = getDraft();

  try {

    // Keep existing behavior (creates the WYWH-xxxxxx order number)
    const order = createOrder();

    // Save the order to Firestore
    await createOrderRecord({
      ...draft,
      orderId: order.id
    });

    // Continue to the success page
    window.location.href = "success.html";

  } catch (error) {

    console.error("Error creating order:", error);

    alert("Sorry, we couldn't submit your order. Please try again.");

  }

});