const {setGlobalOptions} = require("firebase-functions");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const Stripe = require("stripe");
const {createHash, randomBytes, randomInt, timingSafeEqual} = require("crypto");

setGlobalOptions({maxInstances: 10, region: "us-central1"});

initializeApp();
const db = getFirestore();
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const resendApiKey = defineSecret("RESEND_API_KEY");

const POSTCARD_PRICE_CENTS = 299;
const WEB_APP_URL = "https://etherstudios.net/projects/wywh";
const FIREBASE_WEB_APP_URL = "https://wish-you-were-here-dev.web.app";
const FIREBASE_APP_URL = "https://wish-you-were-here-dev.firebaseapp.com";
const CHECKOUT_ORIGINS = [
  "https://etherstudios.net",
  FIREBASE_WEB_APP_URL,
  FIREBASE_APP_URL,
];
const OPERATOR_EMAIL = "josef.hapli@gmail.com";
const ADDRESS_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_PROOF_TTL_MS = 15 * 60 * 1000;
const EMAIL_CODE_RESEND_MS = 60 * 1000;
const PROMO_RESERVATION_TTL_MS = 35 * 60 * 1000;
const FROM_EMAIL = "Wish You Were Here Postcards <postcards@mail.etherstudios.net>";

function getStripe() {
  return new Stripe(stripeSecretKey.value());
}

function requiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }

  return value.trim();
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }
  return value.trim();
}

function optionalImageDimension(value, field) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 50000) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }
  return value;
}

function imageOrientation(value) {
  const orientation = value || "landscape";
  if (!new Set(["landscape", "portrait-clockwise"]).has(orientation)) {
    throw new HttpsError("invalid-argument", "Provide a valid photo orientation.");
  }
  return orientation;
}

function requiredEmail(value, field = "email address") {
  const email = requiredText(value, field, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }
  return email;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail({to, subject, text, html, replyTo}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
      ...(replyTo ? {reply_to: replyTo} : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error("Resend rejected an email", {status: response.status, detail});
    throw new HttpsError("internal", "We couldn't send the email. Please try again.");
  }

  return response.json();
}

function requiredToken(value, field = "request token") {
  const token = requiredText(value, field, 128);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }
  return token;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token, expectedHash) {
  if (typeof expectedHash !== "string" || expectedHash.length !== 64) return false;
  const actual = Buffer.from(tokenHash(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return timingSafeEqual(actual, expected);
}

function addressRequestRef(requestId) {
  const id = requiredText(requestId, "request ID", 80);
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) {
    throw new HttpsError("invalid-argument", "Provide a valid request ID.");
  }
  return db.collection("addressRequests").doc(id);
}

function addressRequestExpiry(data) {
  return data.expiresAt?.toMillis?.() || 0;
}

function assertActiveAddressRequest(data) {
  if (!data || data.status !== "pending" || addressRequestExpiry(data) <= Date.now()) {
    throw new HttpsError("failed-precondition", "This address request is no longer active.");
  }
}

function requestedAddress(data) {
  const address = data.address || {};
  return {
    name: requiredText(address.name, "recipient name", 120),
    address: requiredText(address.address, "street address", 200),
    city: requiredText(address.city, "city", 100),
    state: requiredText(address.state, "state", 50),
    zip: requiredText(address.zip, "ZIP code", 20),
  };
}

function mailingAddress(data, field = "return address") {
  const address = data || {};
  return {
    address: requiredText(address.address, `${field} street`, 200),
    address2: optionalText(address.address2, `${field} line 2`, 100),
    city: requiredText(address.city, `${field} city`, 100),
    state: requiredText(address.state, `${field} state`, 50),
    zip: requiredText(address.zip, `${field} ZIP code`, 20),
    country: optionalText(address.country, `${field} country`, 2).toUpperCase() || "US",
  };
}

function stripeMailingAddress(customerDetails) {
  const address = customerDetails?.address || {};
  return mailingAddress({
    address: address.line1,
    address2: address.line2,
    city: address.city,
    state: address.state,
    zip: address.postal_code,
    country: address.country,
  }, "billing address");
}

function resumableDraft(data, recipientName) {
  const draft = data || {};
  return {
    image: requiredText(draft.image, "photo", 700000),
    imageOrientation: imageOrientation(draft.imageOrientation),
    imageSourceWidth: optionalImageDimension(draft.imageSourceWidth, "photo width"),
    imageSourceHeight: optionalImageDimension(draft.imageSourceHeight, "photo height"),
    message: requiredText(draft.message, "message", 350),
    recipient: recipientName,
  };
}

function verificationRef(verificationId) {
  const id = requiredText(verificationId, "verification ID", 64);
  if (!/^[a-f0-9]{64}$/.test(id)) {
    throw new HttpsError("invalid-argument", "Provide a valid verification ID.");
  }
  return db.collection("senderEmailVerifications").doc(id);
}

async function verifiedSender(request) {
  const authEmail = request.auth?.token?.email;
  if (authEmail && request.auth?.token?.email_verified === true) {
    return {email: requiredEmail(authEmail), verificationRef: null};
  }

  const verificationId = requiredText(request.data?.verificationId, "verification ID", 64);
  const proofToken = requiredToken(request.data?.proofToken, "verification proof");
  const ref = verificationRef(verificationId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  const proofExpiry = data?.proofExpiresAt?.toMillis?.() || 0;

  if (!snapshot.exists || data.status !== "verified" || data.consumedAt ||
      proofExpiry <= Date.now() || !tokenMatches(proofToken, data.proofTokenHash)) {
    throw new HttpsError("permission-denied", "Verify your email before sending this request.");
  }

  return {email: requiredEmail(data.email), verificationRef: ref};
}

function addressRequestEmail({senderName, senderEmail, recipientName, recognitionNote, requestUrl}) {
  const safeSender = escapeHtml(senderName);
  const safeSenderEmail = escapeHtml(senderEmail);
  const safeRecipient = escapeHtml(recipientName);
  const safeNote = escapeHtml(recognitionNote);
  const safeUrl = escapeHtml(requestUrl);
  const requestOrigin = new URL(requestUrl).origin;
  const safeOrigin = escapeHtml(requestOrigin);
  const noteText = recognitionNote ? `\n\nA note from ${senderName}: “${recognitionNote}”` : "";
  const noteHtml = recognitionNote ? `<p><strong>A note from ${safeSender}:</strong><br>${safeNote}</p>` : "";
  return {
    subject: `${senderName} sent you a postcard address request`,
    text: `Hi ${recipientName},\n\n${senderName} asked Wish You Were Here to collect your mailing address so they can send you a printed postcard.\n\nVerified sender email: ${senderEmail}${noteText}\n\nReview the request on Wish You Were Here:\n${requestUrl}\n\nBefore sharing your address, make sure you recognize the sender name and email above. You can ignore this message if you were not expecting it.\n\nWish You Were Here will not ask for a password or payment. The request link can be used once and expires in 7 days.`,
    html: `<p>Hi ${safeRecipient},</p><p><strong>${safeSender}</strong> asked Wish You Were Here to collect your mailing address so they can send you a printed postcard.</p><p><strong>Verified sender email:</strong> ${safeSenderEmail}</p>${noteHtml}<p><a href="${safeUrl}">Review the address request</a></p><p>This link opens Wish You Were Here at <strong>${safeOrigin}</strong>.</p><p>Before sharing your address, make sure you recognize the sender name and email above. You can ignore this message if you were not expecting it.</p><p>Wish You Were Here will not ask for a password or payment. The request link can be used once and expires in 7 days.</p>`,
  };
}

function completionEmail({senderName, recipientName, resumeUrl}) {
  const safeSender = escapeHtml(senderName);
  const safeRecipient = escapeHtml(recipientName);
  const safeUrl = escapeHtml(resumeUrl);
  return {
    subject: `${recipientName} shared their mailing address`,
    text: `Hi ${senderName},\n\n${recipientName} shared their mailing address. Continue your postcard here:\n\n${resumeUrl}\n\nThis private link can be used once.`,
    html: `<p>Hi ${safeSender},</p><p><strong>${safeRecipient}</strong> shared their mailing address.</p><p><a href="${safeUrl}">Finish your postcard</a></p><p>This private link can be used once.</p>`,
  };
}

function getOrderDraft(data) {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Order details are required.");
  }

  const recipient = data.recipient || {};
  const memory = data.memory || {};
  const sender = data.sender || {};
  const returnAddressSource = sender.returnAddressSource === "separate" ? "separate" : "billing";

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
      imageOrientation: imageOrientation(memory.imageOrientation),
      imageSourceWidth: optionalImageDimension(memory.imageSourceWidth, "photo width"),
      imageSourceHeight: optionalImageDimension(memory.imageSourceHeight, "photo height"),
    },
    sender: {
      name: requiredText(sender.name, "sender name", 120),
      returnAddressSource,
      returnAddress: returnAddressSource === "separate"
        ? mailingAddress(sender.returnAddress)
        : null,
    },
  };
}

function createOrderId() {
  return `WYWH-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function checkoutAppUrl(request) {
  const origin = request.rawRequest?.get("origin");
  if (origin === FIREBASE_WEB_APP_URL || origin === FIREBASE_APP_URL) {
    return origin;
  }

  return WEB_APP_URL;
}

function assertOperator(request) {
  const email = request.auth?.token?.email;
  const emailVerified = request.auth?.token?.email_verified === true;

  if (!email || email.toLowerCase() !== OPERATOR_EMAIL || !emailVerified) {
    throw new HttpsError("permission-denied", "This account is not authorized to fulfill WYWH orders.");
  }
}

function promotionCode(value) {
  const code = requiredText(value, "promo code", 32).toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Promo codes may use letters, numbers, hyphens, and underscores.");
  }
  return code;
}

function promotionPricing(promotion, code, now = Date.now()) {
  const startsAt = promotion.startsAt?.toMillis?.() || 0;
  const endsAt = promotion.endsAt?.toMillis?.() || Number.MAX_SAFE_INTEGER;
  const redemptionLimit = Number.isInteger(promotion.redemptionLimit) ? promotion.redemptionLimit : null;
  const redemptionCount = Number.isInteger(promotion.redemptionCount) ? promotion.redemptionCount : 0;
  const reservationCount = Number.isInteger(promotion.reservationCount) ? promotion.reservationCount : 0;

  if (!promotion.active || now < startsAt || now > endsAt ||
      (redemptionLimit !== null && redemptionCount + reservationCount >= redemptionLimit)) {
    throw new HttpsError("failed-precondition", "That promo code is not currently available.");
  }

  let discountCents;
  if (promotion.discountType === "fixed") {
    discountCents = Math.min(promotion.discountValue, POSTCARD_PRICE_CENTS);
  } else if (promotion.discountType === "percentage") {
    discountCents = Math.round(POSTCARD_PRICE_CENTS * promotion.discountValue / 100);
  } else {
    throw new HttpsError("failed-precondition", "That promo code is not configured correctly.");
  }

  return {
    subtotalCents: POSTCARD_PRICE_CENTS,
    discountCents,
    totalCents: Math.max(POSTCARD_PRICE_CENTS - discountCents, 0),
    currency: "usd",
    promoCode: code,
    promotionId: code,
  };
}

async function pricingFor(promoCode) {
  if (!promoCode) {
    return {
      subtotalCents: POSTCARD_PRICE_CENTS,
      discountCents: 0,
      totalCents: POSTCARD_PRICE_CENTS,
      currency: "usd",
      promoCode: null,
    };
  }

  const code = promotionCode(promoCode);
  const snapshot = await db.collection("promotions").doc(code).get();
  if (!snapshot.exists) {
    throw new HttpsError("invalid-argument", "That promo code is not valid.");
  }
  return promotionPricing(snapshot.data(), code);
}

function promotionDate(value, field, required = false) {
  if (!value && !required) return null;
  const date = new Date(requiredText(value, field, 40));
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError("invalid-argument", `Provide a valid ${field}.`);
  }
  return date;
}

exports.validatePromotion = onCall({cors: CHECKOUT_ORIGINS}, async (request) => {
  const code = promotionCode(request.data?.code);
  const pricing = await pricingFor(code);
  return {code, ...pricing};
});

exports.listPromotions = onCall(async (request) => {
  assertOperator(request);
  const snapshot = await db.collection("promotions").orderBy("code").limit(100).get();
  return {
    promotions: snapshot.docs.map((doc) => {
      const promotion = doc.data();
      return {
        code: doc.id,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startsAt: promotion.startsAt?.toDate?.().toISOString() || null,
        endsAt: promotion.endsAt?.toDate?.().toISOString() || null,
        redemptionLimit: promotion.redemptionLimit ?? null,
        redemptionCount: promotion.redemptionCount || 0,
        reservationCount: promotion.reservationCount || 0,
        active: promotion.active === true,
      };
    }),
  };
});

exports.savePromotion = onCall(async (request) => {
  assertOperator(request);
  const code = promotionCode(request.data?.code);
  const discountType = requiredText(request.data?.discountType, "discount type", 20);
  const discountValue = Number(request.data?.discountValue);
  const redemptionLimit = request.data?.redemptionLimit === null || request.data?.redemptionLimit === ""
    ? null
    : Number(request.data?.redemptionLimit);
  const startsAt = promotionDate(request.data?.startsAt, "start date", true);
  const endsAt = promotionDate(request.data?.endsAt, "end date");

  if (!new Set(["fixed", "percentage"]).has(discountType) ||
      !Number.isInteger(discountValue) || discountValue <= 0 ||
      (discountType === "percentage" && discountValue > 100)) {
    throw new HttpsError("invalid-argument", "Provide a valid fixed-cent or percentage discount.");
  }
  if (redemptionLimit !== null && (!Number.isInteger(redemptionLimit) || redemptionLimit < 1)) {
    throw new HttpsError("invalid-argument", "Redemption limit must be a positive whole number.");
  }
  if (endsAt && endsAt <= startsAt) {
    throw new HttpsError("invalid-argument", "End date must be after the start date.");
  }

  const ref = db.collection("promotions").doc(code);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    transaction.set(ref, {
      code,
      discountType,
      discountValue,
      startsAt,
      endsAt,
      redemptionLimit,
      redemptionCount: existing.data()?.redemptionCount || 0,
      reservationCount: existing.data()?.reservationCount || 0,
      active: request.data?.active === true,
      createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return {code};
});

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
    sender: draft.sender,
    keepsake: {type: "postcard", quantity: 1},
    pricing,
  };
}

async function releasePromotionReservation(orderRef) {
  return db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return false;
    const order = orderSnapshot.data();
    if (order.promotionReservationStatus !== "reserved" || !order.pricing?.promotionId) return false;

    const promotionRef = db.collection("promotions").doc(order.pricing.promotionId);
    const promotionSnapshot = await transaction.get(promotionRef);
    if (promotionSnapshot.exists) {
      const reservationCount = Math.max((promotionSnapshot.data().reservationCount || 0) - 1, 0);
      transaction.update(promotionRef, {reservationCount, updatedAt: FieldValue.serverTimestamp()});
    }
    transaction.update(orderRef, {
      promotionReservationStatus: "released",
      promotionReservationReleasedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

exports.createCheckout = onCall(
  {cors: CHECKOUT_ORIGINS, secrets: [stripeSecretKey]},
  async (request) => {
    const draft = getOrderDraft(request.data?.draft);
    const promoCode = typeof request.data?.promoCode === "string"
      ? request.data.promoCode.trim().toUpperCase()
      : "";
    const pricing = await pricingFor(promoCode);
    const orderId = createOrderId();
    const orderRef = db.collection("orders").doc(orderId);
    const appUrl = checkoutAppUrl(request);

    if (pricing.totalCents === 0 && draft.sender.returnAddressSource !== "separate") {
      throw new HttpsError("invalid-argument", "Add a return address for a free postcard order.");
    }

    if (pricing.totalCents === 0) {
      await db.runTransaction(async (transaction) => {
        if (pricing.promotionId) {
          const promotionRef = db.collection("promotions").doc(pricing.promotionId);
          const snapshot = await transaction.get(promotionRef);
          promotionPricing(snapshot.data() || {}, pricing.promotionId);
          transaction.update(promotionRef, {
            redemptionCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        transaction.create(orderRef, orderData(orderId, draft, pricing, "comped"));
      });
      logger.info("Created comped promotional order", {orderId, promoCode: pricing.promoCode});
      return {mode: "promo", orderId};
    }

    await db.runTransaction(async (transaction) => {
      if (pricing.promotionId) {
        const promotionRef = db.collection("promotions").doc(pricing.promotionId);
        const snapshot = await transaction.get(promotionRef);
        promotionPricing(snapshot.data() || {}, pricing.promotionId);
        transaction.update(promotionRef, {
          reservationCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.create(orderRef, {
        ...orderData(orderId, draft, pricing, "pending"),
        ...(pricing.promotionId ? {
          promotionReservationStatus: "reserved",
          promotionReservationExpiresAt: new Date(Date.now() + PROMO_RESERVATION_TTL_MS),
        } : {}),
      });
    });

    let session;
    try {
      session = await getStripe().checkout.sessions.create({
        mode: "payment",
        billing_address_collection: "required",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {name: "Wish You Were Here Postcard"},
            unit_amount: pricing.totalCents,
          },
          quantity: 1,
        }],
        metadata: {orderId},
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${appUrl}/success.html?order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout.html?order_id=${encodeURIComponent(orderId)}`,
        submit_type: "pay",
      });

    } catch (error) {
      if (pricing.promotionId) {
        await releasePromotionReservation(orderRef);
      }
      await orderRef.delete();
      logger.error("Unable to create Stripe Checkout session", {orderId, error});
      throw new HttpsError("internal", "We couldn't start secure payment. Please try again.");
    }

    if (!session.url) {
      if (pricing.promotionId) await releasePromotionReservation(orderRef);
      await orderRef.delete();
      throw new HttpsError("internal", "We couldn't start secure payment. Please try again.");
    }

    try {
      await orderRef.update({
        stripeCheckoutSessionId: session.id,
        ...(pricing.promotionId ? {
          promotionReservationExpiresAt: new Date(session.expires_at * 1000),
        } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      // Stripe metadata still links this session to the durable order. Returning
      // the valid session is safer than deleting an order that could be paid.
      logger.warn("Checkout session created before order metadata update failed", {
        orderId,
        sessionId: session.id,
        error,
      });
    }
    return {mode: "payment", checkoutUrl: session.url, orderId};
  }
);

exports.sendSenderVerificationCode = onCall(
  {cors: CHECKOUT_ORIGINS, secrets: [resendApiKey]},
  async (request) => {
    const email = requiredEmail(request.data?.email, "sender email address");
    const verificationId = tokenHash(email);
    const ref = db.collection("senderEmailVerifications").doc(verificationId);
    const existing = await ref.get();
    const lastSentAt = existing.data()?.sentAt?.toMillis?.() || 0;

    if (lastSentAt && Date.now() - lastSentAt < EMAIL_CODE_RESEND_MS) {
      throw new HttpsError("resource-exhausted", "Wait a minute before requesting another code.");
    }

    const code = String(randomInt(100000, 1000000));
    await ref.set({
      email,
      codeHash: tokenHash(`${verificationId}:${code}`),
      status: "pending",
      attempts: 0,
      sentAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
    });

    try {
      await sendEmail({
        to: email,
        subject: `${code} is your Wish You Were Here verification code`,
        text: `Your Wish You Were Here verification code is ${code}. It expires in 10 minutes. If you didn't request it, you can ignore this email.`,
        html: `<p>Your Wish You Were Here verification code is:</p><p><strong>${code}</strong></p><p>It expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
      });
    } catch (error) {
      await ref.delete();
      throw error;
    }

    return {verificationId};
  }
);

exports.verifySenderEmailCode = onCall({cors: CHECKOUT_ORIGINS}, async (request) => {
  const verificationId = requiredText(request.data?.verificationId, "verification ID", 64);
  const code = requiredText(request.data?.code, "verification code", 6);
  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Enter the 6-digit verification code.");
  }
  const ref = verificationRef(verificationId);
  const proofToken = randomBytes(32).toString("base64url");
  let invalidCode = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const expiresAt = data?.expiresAt?.toMillis?.() || 0;
    if (!snapshot.exists || data.status !== "pending" || expiresAt <= Date.now()) {
      throw new HttpsError("failed-precondition", "This verification code has expired.");
    }
    if ((data.attempts || 0) >= 5) {
      throw new HttpsError("resource-exhausted", "Too many attempts. Request a new code.");
    }
    if (!tokenMatches(`${verificationId}:${code}`, data.codeHash)) {
      transaction.update(ref, {attempts: FieldValue.increment(1)});
      invalidCode = true;
      return;
    }
    transaction.update(ref, {
      status: "verified",
      codeHash: FieldValue.delete(),
      proofTokenHash: tokenHash(proofToken),
      proofExpiresAt: new Date(Date.now() + EMAIL_PROOF_TTL_MS),
      verifiedAt: FieldValue.serverTimestamp(),
    });
  });

  if (invalidCode) {
    throw new HttpsError("invalid-argument", "That verification code is not correct.");
  }

  return {proofToken};
});

exports.createAddressRequest = onCall(
  {cors: CHECKOUT_ORIGINS, secrets: [resendApiKey]},
  async (request) => {
    const recipientName = requiredText(request.data?.recipientName, "recipient name", 120);
    const recipientEmail = requiredEmail(request.data?.recipientEmail, "recipient email address");
    const senderName = requiredText(request.data?.senderName, "sender name", 120);
    const recognitionNote = optionalText(request.data?.recognitionNote, "recognition note", 120);
    const draft = resumableDraft(request.data?.draft, recipientName);
    const sender = await verifiedSender(request);
    const requestId = randomBytes(18).toString("base64url");
    const submitToken = randomBytes(32).toString("base64url");
    const now = Date.now();
    const appUrl = checkoutAppUrl(request);
    const requestUrl = `${appUrl}/address-request.html?request=${encodeURIComponent(requestId)}&token=${encodeURIComponent(submitToken)}`;
    const ref = db.collection("addressRequests").doc(requestId);

    await ref.create({
      status: "pending",
      recipientName,
      recipientEmail,
      senderName,
      senderEmail: sender.email,
      recognitionNote,
      draft,
      appUrl,
      submitTokenHash: tokenHash(submitToken),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(now + ADDRESS_REQUEST_TTL_MS),
    });

    try {
      const email = addressRequestEmail({
        senderName,
        senderEmail: sender.email,
        recipientName,
        recognitionNote,
        requestUrl,
      });
      await sendEmail({to: recipientEmail, ...email});
      await ref.update({requestEmailSentAt: FieldValue.serverTimestamp()});
      if (sender.verificationRef) {
        await sender.verificationRef.update({consumedAt: FieldValue.serverTimestamp()});
      }
    } catch (error) {
      await ref.delete();
      throw error;
    }

    return {requestId, expiresAt: new Date(now + ADDRESS_REQUEST_TTL_MS).toISOString()};
  }
);

exports.getAddressRequest = onCall({cors: CHECKOUT_ORIGINS}, async (request) => {
  const submitToken = requiredToken(request.data?.submitToken);
  const snapshot = await addressRequestRef(request.data?.requestId).get();
  const data = snapshot.data();

  if (!snapshot.exists || !tokenMatches(submitToken, data?.submitTokenHash)) {
    throw new HttpsError("not-found", "That address request was not found.");
  }
  assertActiveAddressRequest(data);
  return {
    recipientName: data.recipientName || "",
    senderName: data.senderName || "",
    senderEmail: data.senderEmail || "",
    recognitionNote: data.recognitionNote || "",
    expiresAt: new Date(addressRequestExpiry(data)).toISOString(),
  };
});

exports.submitAddressRequest = onCall(
  {cors: CHECKOUT_ORIGINS, secrets: [resendApiKey]},
  async (request) => {
    const submitToken = requiredToken(request.data?.submitToken);
    const address = requestedAddress(request.data);
    const ref = addressRequestRef(request.data?.requestId);
    const claimToken = randomBytes(32).toString("base64url");
    let requestData;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      requestData = snapshot.data();
      if (!snapshot.exists || !tokenMatches(submitToken, requestData?.submitTokenHash)) {
        throw new HttpsError("not-found", "That address request was not found.");
      }
      if (requestData.status === "pending") assertActiveAddressRequest(requestData);
      if (!new Set(["pending", "completed"]).has(requestData.status)) {
        throw new HttpsError("failed-precondition", "This address request can no longer be submitted.");
      }
      transaction.update(ref, {
        status: "completed",
        address,
        claimTokenHash: tokenHash(claimToken),
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const resumeUrl = `${requestData.appUrl}/message.html?request=${encodeURIComponent(request.data.requestId)}&claim=${encodeURIComponent(claimToken)}`;
    const email = completionEmail({
      senderName: requestData.senderName,
      recipientName: requestData.recipientName,
      resumeUrl,
    });
    await sendEmail({to: requestData.senderEmail, ...email});
    await ref.update({
      submitTokenHash: FieldValue.delete(),
      completionEmailSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {status: "completed"};
  }
);

exports.claimAddressRequest = onCall({cors: CHECKOUT_ORIGINS}, async (request) => {
  const claimToken = requiredToken(request.data?.claimToken, "claim token");
  const ref = addressRequestRef(request.data?.requestId);
  let claimedDraft;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (!snapshot.exists || !tokenMatches(claimToken, data?.claimTokenHash)) {
      throw new HttpsError("not-found", "That address request was not found.");
    }
    if (data.status !== "completed" || !data.address) {
      throw new HttpsError("failed-precondition", "This address request can no longer be claimed.");
    }
    claimedDraft = {...data.draft, ...data.address};
    transaction.update(ref, {
      status: "claimed",
      address: FieldValue.delete(),
      draft: FieldValue.delete(),
      claimTokenHash: FieldValue.delete(),
      claimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {status: "completed", draft: claimedDraft};
});

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
        const orderRef = db.collection("orders").doc(orderId);
        await db.runTransaction(async (transaction) => {
          const orderSnapshot = await transaction.get(orderRef);
          if (!orderSnapshot.exists) throw new Error(`Order ${orderId} was not found.`);
          const order = orderSnapshot.data();
          // Stripe retries deliveries. Never move a fulfilled order back into
          // the queue or change its original payment timestamp on replay.
          if (order.paymentStatus === "paid") return;
          const shouldRedeemPromotion = ["reserved", "released"].includes(order.promotionReservationStatus) &&
            Boolean(order.pricing?.promotionId);
          const promotionRef = shouldRedeemPromotion
            ? db.collection("promotions").doc(order.pricing.promotionId)
            : null;
          const promotionSnapshot = promotionRef ? await transaction.get(promotionRef) : null;
          const sender = order.sender || {};
          const returnAddress = sender.returnAddressSource === "separate"
            ? sender.returnAddress
            : stripeMailingAddress(session.customer_details);

          if (promotionRef && promotionSnapshot?.exists) {
            const promotion = promotionSnapshot.data();
            transaction.update(promotionRef, {
              reservationCount: order.promotionReservationStatus === "reserved"
                ? Math.max((promotion.reservationCount || 0) - 1, 0)
                : promotion.reservationCount || 0,
              redemptionCount: (promotion.redemptionCount || 0) + 1,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          transaction.update(orderRef, {
            status: "queued",
            paymentStatus: "paid",
            fulfillmentStatus: "queued",
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
            sender: {...sender, returnAddress},
            ...(promotionRef ? {
              promotionReservationStatus: "redeemed",
              promotionRedeemedAt: FieldValue.serverTimestamp(),
            } : {}),
            paidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
        logger.info("Marked Stripe order paid", {orderId, sessionId: session.id});
      }
    }

    if (event.type === "checkout.session.expired") {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) {
        const released = await releasePromotionReservation(db.collection("orders").doc(orderId));
        logger.info("Processed expired Stripe checkout", {orderId, released});
      }
    }

    response.json({received: true});
  }
);

exports.cleanupExpiredPromotionReservations = onSchedule({
  schedule: "every 15 minutes",
  secrets: [stripeSecretKey],
}, async () => {
  const snapshot = await db.collection("orders")
    .where("promotionReservationStatus", "==", "reserved")
    .where("promotionReservationExpiresAt", "<=", new Date())
    .limit(100)
    .get();
  const expired = snapshot.docs.filter((doc) => doc.data().promotionReservationStatus === "reserved");
  const results = await Promise.all(expired.map(async (doc) => {
    const sessionId = doc.data().stripeCheckoutSessionId;
    // A completed payment may be waiting for webhook delivery. Only release
    // when Stripe confirms expiration, not merely when our local timer ends.
    if (!sessionId) return false;
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.status !== "expired") return false;
    return releasePromotionReservation(doc.ref);
  }));
  logger.info("Cleaned expired promotion reservations", {
    inspected: snapshot.size,
    released: results.filter(Boolean).length,
  });
});

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
    sender: order.sender,
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
