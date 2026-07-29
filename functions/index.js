const {setGlobalOptions} = require("firebase-functions");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const Stripe = require("stripe");
const {randomBytes} = require("crypto");

setGlobalOptions({maxInstances: 10, region: "us-central1"});

initializeApp();
const db = getFirestore();
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const POSTCARD_PRICE_CENTS = 299;
const BETA_PROMO_CODE = "TEST2026";
const WEB_APP_URL = "https://etherstudios.net/projects/wywh";
const OPERATOR_EMAIL = "josef.hapli@gmail.com";

function getStripe() {
  return new Stripe(stripeSecretKey.value());
}

function requiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }

  return value.trim();
}

function getOrderDraft(data) {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Order details are required.");
  }

  const recipient = data.recipient || {};
  const memory = data.memory || {};

  return {
    recipient: {
      name: requiredText(recipient.name, "recipient name", 120),
      address: requiredText(recipient.address, "street address", 200),
      city: requiredText(recipient.city, "city", 100),
      state: requiredText(recipient.state, "state", 50),
      zip: requiredText(recipient.zip, "ZIP code", 20),
    },
    memory: {
      message: requiredText(memory.message, "message", 350),
      image: requiredText(memory.image, "photo", 700000),
    },
  };
}

function createOrderId() {
  return `WYWH-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function assertOperator(request) {
  const email = request.auth?.token?.email;
  const emailVerified = request.auth?.token?.email_verified === true;

  if (!email || email.toLowerCase() !== OPERATOR_EMAIL || !emailVerified) {
    throw new HttpsError("permission-denied", "This account is not authorized to fulfill WYWH orders.");
  }
}

function pricingFor(promoCode) {
  if (!promoCode) {
    return {
      subtotalCents: POSTCARD_PRICE_CENTS,
      discountCents: 0,
      totalCents: POSTCARD_PRICE_CENTS,
      currency: "usd",
      promoCode: null,
    };
  }

  if (promoCode !== BETA_PROMO_CODE) {
    throw new HttpsError("invalid-argument", "That promo code is not valid.");
  }

  return {
    subtotalCents: POSTCARD_PRICE_CENTS,
    discountCents: POSTCARD_PRICE_CENTS,
    totalCents: 0,
    currency: "usd",
    promoCode: BETA_PROMO_CODE,
  };
}

function orderData(orderId, draft, pricing, paymentStatus) {
  return {
    orderId,
    status: paymentStatus === "paid" || paymentStatus === "comped" ? "queued" : "payment_pending",
    paymentStatus,
    fulfillmentStatus: "queued",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    recipient: draft.recipient,
    memory: draft.memory,
    keepsake: {type: "postcard", quantity: 1},
    pricing,
  };
}

exports.createCheckout = onCall(
  {cors: ["https://etherstudios.net"], secrets: [stripeSecretKey]},
  async (request) => {
    const draft = getOrderDraft(request.data?.draft);
    const promoCode = typeof request.data?.promoCode === "string"
      ? request.data.promoCode.trim().toUpperCase()
      : "";
    const pricing = pricingFor(promoCode);
    const orderId = createOrderId();
    const orderRef = db.collection("orders").doc(orderId);

    if (pricing.totalCents === 0) {
      await orderRef.create(orderData(orderId, draft, pricing, "comped"));
      logger.info("Created comped beta order", {orderId, promoCode: pricing.promoCode});
      return {mode: "promo", orderId};
    }

    await orderRef.create(orderData(orderId, draft, pricing, "pending"));

    try {
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {name: "Wish You Were Here Postcard"},
            unit_amount: POSTCARD_PRICE_CENTS,
          },
          quantity: 1,
        }],
        metadata: {orderId},
        success_url: `${WEB_APP_URL}/success.html?order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${WEB_APP_URL}/checkout.html?order_id=${encodeURIComponent(orderId)}`,
        submit_type: "pay",
      });

      if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL.");
      }

      await orderRef.update({
        stripeCheckoutSessionId: session.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {mode: "payment", checkoutUrl: session.url, orderId};
    } catch (error) {
      await orderRef.delete();
      logger.error("Unable to create Stripe Checkout session", {orderId, error});
      throw new HttpsError("internal", "We couldn't start secure payment. Please try again.");
    }
  }
);

exports.stripeWebhook = onRequest(
  {cors: false, secrets: [stripeSecretKey, stripeWebhookSecret]},
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    const signature = request.header("stripe-signature");
    if (!signature) {
      response.status(400).send("Missing Stripe signature");
      return;
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        request.rawBody,
        signature,
        stripeWebhookSecret.value()
      );
    } catch (error) {
      logger.warn("Rejected Stripe webhook", {error});
      response.status(400).send("Invalid Stripe signature");
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId && session.payment_status === "paid") {
        await db.collection("orders").doc(orderId).update({
          status: "queued",
          paymentStatus: "paid",
          fulfillmentStatus: "queued",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
          paidAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.info("Marked Stripe order paid", {orderId, sessionId: session.id});
      }
    }

    response.json({received: true});
  }
);

exports.listFulfillmentOrders = onCall(async (request) => {
  assertOperator(request);

  const snapshot = await db.collection("orders")
    .where("paymentStatus", "in", ["paid", "comped"])
    .limit(50)
    .get();

  const orders = snapshot.docs
    .map((doc) => ({id: doc.id, ...doc.data()}))
    .map((order) => ({
      orderId: order.orderId,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus || "queued",
      status: order.status || "queued",
      recipientName: order.recipient?.name || "Recipient",
      createdAt: order.createdAt?.toDate?.().toISOString() || null,
    }))
    .sort((first, second) => (second.createdAt || "").localeCompare(first.createdAt || ""));

  return {orders};
});

exports.getFulfillmentOrder = onCall(async (request) => {
  assertOperator(request);
  const orderId = requiredText(request.data?.orderId, "order ID", 40);
  const snapshot = await db.collection("orders").doc(orderId).get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "That order was not found.");
  }

  const order = snapshot.data();
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "comped") {
    throw new HttpsError("failed-precondition", "Only paid orders can be fulfilled.");
  }

  return {
    orderId: order.orderId,
    fulfillmentStatus: order.fulfillmentStatus || "queued",
    recipient: order.recipient,
    memory: order.memory,
  };
});

exports.updateFulfillmentStatus = onCall(async (request) => {
  assertOperator(request);
  const orderId = requiredText(request.data?.orderId, "order ID", 40);
  const fulfillmentStatus = requiredText(request.data?.fulfillmentStatus, "fulfillment status", 20);
  const allowedStatuses = new Set(["queued", "printing", "mailed"]);

  if (!allowedStatuses.has(fulfillmentStatus)) {
    throw new HttpsError("invalid-argument", "Use queued, printing, or mailed.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const snapshot = await orderRef.get();
  if (!snapshot.exists || !["paid", "comped"].includes(snapshot.data().paymentStatus)) {
    throw new HttpsError("failed-precondition", "Only paid orders can be fulfilled.");
  }

  await orderRef.update({
    status: fulfillmentStatus,
    fulfillmentStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {orderId, fulfillmentStatus};
});
