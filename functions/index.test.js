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
};

test.after(() => firebaseFunctionsTest.cleanup());

test("checkout rejects incomplete recipient details before creating an order", async () => {
  const createCheckout = firebaseFunctionsTest.wrap(functions.createCheckout);

  await assert.rejects(
    createCheckout({data: {draft: {...validDraft, recipient: {...validDraft.recipient, city: ""}}}}),
    (error) => error.code === "invalid-argument" && /city/.test(error.message)
  );
});

test("checkout rejects an unknown promo before creating an order", async () => {
  const createCheckout = firebaseFunctionsTest.wrap(functions.createCheckout);

  await assert.rejects(
    createCheckout({data: {draft: validDraft, promoCode: "NOTREAL"}}),
    (error) => error.code === "invalid-argument" && /promo code/.test(error.message)
  );
});

test("fulfillment functions reject unauthenticated callers", async () => {
  const listOrders = firebaseFunctionsTest.wrap(functions.listFulfillmentOrders);

  await assert.rejects(
    listOrders({}),
    (error) => error.code === "permission-denied"
  );
});
