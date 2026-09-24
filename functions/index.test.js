const test = require("node:test");
const assert = require("node:assert/strict");
const firebaseFunctionsTest = require("firebase-functions-test")();
const functions = require("./index.js");

const validDraft = {
  recipient: {
    name: "Avery Stone",
    address: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
  },
  memory: {
    message: "Wish you were here!",
    image: "data:image/jpeg;base64,abc",
  },
  sender: {
    name: "Jordan Stone",
    returnAddressSource: "billing",
  },
};

test.after(() => firebaseFunctionsTest.cleanup());

test("checkout rejects incomplete recipient details before creating an order", async () => {
  const createCheckout = firebaseFunctionsTest.wrap(functions.createCheckout);

  await assert.rejects(
    createCheckout({data: {draft: {...validDraft, recipient: {...validDraft.recipient, city: ""}}}}),
    (error) => error.code === "invalid-argument" && /city/.test(error.message)
  );
});

test("checkout rejects an unknown photo orientation", async () => {
  const createCheckout = firebaseFunctionsTest.wrap(functions.createCheckout);
  const draft = {
    ...validDraft,
    memory: {...validDraft.memory, imageOrientation: "upside-down"},
  };

  await assert.rejects(
    createCheckout({data: {draft}}),
    (error) => error.code === "invalid-argument" && /orientation/.test(error.message)
  );
});

test("checkout validates a separate return address before payment", async () => {
  const createCheckout = firebaseFunctionsTest.wrap(functions.createCheckout);
  const draft = {
    ...validDraft,
    sender: {
      name: "Jordan Stone",
      returnAddressSource: "separate",
      returnAddress: {address: "", city: "New York", state: "NY", zip: "10001"},
    },
  };

  await assert.rejects(
    createCheckout({data: {draft}}),
    (error) => error.code === "invalid-argument" && /return address street/.test(error.message)
  );
});

test("checkout rejects a malformed promo before creating an order", async () => {
  const createCheckout = firebaseFunctionsTest.wrap(functions.createCheckout);

  await assert.rejects(
    createCheckout({data: {draft: validDraft, promoCode: "NO!"}}),
    (error) => error.code === "invalid-argument" && /Promo code/.test(error.message)
  );
});

test("promotion management rejects unauthenticated callers", async () => {
  const listPromotions = firebaseFunctionsTest.wrap(functions.listPromotions);
  await assert.rejects(listPromotions({}), (error) => error.code === "permission-denied");
});

test("fulfillment functions reject unauthenticated callers", async () => {
  const listOrders = firebaseFunctionsTest.wrap(functions.listFulfillmentOrders);

  await assert.rejects(
    listOrders({}),
    (error) => error.code === "permission-denied"
  );
});

test("address request lookup rejects malformed tokens before reading private data", async () => {
  const getAddressRequest = firebaseFunctionsTest.wrap(functions.getAddressRequest);

  await assert.rejects(
    getAddressRequest({data: {requestId: "request-id", submitToken: "too-short"}}),
    (error) => error.code === "invalid-argument" && /token/.test(error.message)
  );
});

test("address request submission validates every address field", async () => {
  const submitAddressRequest = firebaseFunctionsTest.wrap(functions.submitAddressRequest);

  await assert.rejects(
    submitAddressRequest({data: {
      requestId: "abcdefghijklmnopqrstuvwx",
      submitToken: "abcdefghijklmnopqrstuvwxyzABCDEFGH",
      address: {name: "Avery Stone", address: "", city: "New York", state: "NY", zip: "10001"},
    }}),
    (error) => error.code === "invalid-argument" && /street address/.test(error.message)
  );
});

test("sender verification rejects invalid email before sending", async () => {
  const sendCode = firebaseFunctionsTest.wrap(functions.sendSenderVerificationCode);

  await assert.rejects(
    sendCode({data: {email: "not-an-email"}}),
    (error) => error.code === "invalid-argument" && /email/.test(error.message)
  );
});

test("sender verification requires a six-digit code", async () => {
  const verifyCode = firebaseFunctionsTest.wrap(functions.verifySenderEmailCode);

  await assert.rejects(
    verifyCode({data: {verificationId: "a".repeat(64), code: "123"}}),
    (error) => error.code === "invalid-argument" && /6-digit/.test(error.message)
  );
});

test("address request requires a verified sender", async () => {
  const createRequest = firebaseFunctionsTest.wrap(functions.createAddressRequest);

  await assert.rejects(
    createRequest({data: {
      senderName: "Josef",
      recipientName: "Avery",
      recipientEmail: "avery@example.com",
      recognitionNote: "Cape May trip",
      draft: {image: "data:image/jpeg;base64,abc", message: "Wish you were here!"},
    }}),
    (error) => error.code === "invalid-argument" && /verification ID/.test(error.message)
  );
});
