const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function harness(initial, sessions = {}) {
  const records = new Map(Object.entries(initial));
  const snapshot = (path) => ({exists: records.has(path), data: () => records.get(path), ref: {path}});
  const db = {
    collection(name) {
      const filters = [];
      let limit = Infinity;
      return {
        doc: (id) => ({path: `${name}/${id}`}),
        where(field, operator, value) { filters.push([field, operator, value]); return this; },
        limit(value) { limit = value; return this; },
        async get() {
          const docs = [...records.keys()].filter((path) => path.startsWith(`${name}/`))
            .filter((path) => filters.every(([field, op, value]) => op === '==' ? records.get(path)[field] === value : records.get(path)[field] <= value))
            .slice(0, limit).map(snapshot);
          return {docs, size: docs.length};
        },
      };
    },
    async runTransaction(fn) {
      return fn({
        get: async (ref) => snapshot(ref.path),
        update: (ref, data) => records.set(ref.path, {...records.get(ref.path), ...data}),
        set: (ref, data) => records.set(ref.path, data),
      });
    },
  };
  const wrap = (...args) => args.at(-1);
  class FakeStripe {
    webhooks = {constructEvent: (body) => body};
    checkout = {sessions: {retrieve: async (id) => sessions[id]}};
  }
  const exports = {};
  const deps = {
    'firebase-functions': {setGlobalOptions() {}},
    'firebase-functions/v2/https': {onCall: wrap, onRequest: wrap, HttpsError: class extends Error {}},
    'firebase-functions/v2/scheduler': {onSchedule: wrap},
    'firebase-functions/params': {defineSecret: () => ({value: () => 'test-only'})},
    'firebase-admin/app': {initializeApp() {}},
    'firebase-admin/firestore': {getFirestore: () => db, FieldValue: {serverTimestamp: () => 'now'}},
    'firebase-functions/logger': {info() {}, warn() {}, error() {}},
    stripe: FakeStripe,
    crypto: require('node:crypto'),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('./index.js'), 'utf8'), {
    exports, require: (name) => { if (!(name in deps)) throw new Error(name); return deps[name]; },
    Buffer, URL, Date, console,
  });
  async function webhook(type, session) {
    await exports.stripeWebhook({method: 'POST', header: () => 'signed-test', rawBody: {type, data: {object: session}}}, {json() {}});
  }
  return {records, functions: exports, webhook};
}

const order = {
  paymentStatus: 'pending', fulfillmentStatus: 'queued',
  sender: {name: 'Test', returnAddressSource: 'separate', returnAddress: {address: 'Test address'}},
  pricing: {promotionId: 'BETA'}, promotionReservationStatus: 'reserved',
  promotionReservationExpiresAt: new Date(0), stripeCheckoutSessionId: 'cs_test_1',
};
const session = {id: 'cs_test_1', metadata: {orderId: 'TEST'}, payment_status: 'paid', payment_intent: 'pi_test_1'};

test('payment replay preserves mailed state and redeems a reserved promotion once', async () => {
  const h = harness({'orders/TEST': {...order}, 'promotions/BETA': {reservationCount: 1, redemptionCount: 0}});
  await h.webhook('checkout.session.completed', session);
  assert.equal(h.records.get('orders/TEST').paymentStatus, 'paid');
  assert.equal(h.records.get('promotions/BETA').redemptionCount, 1);
  h.records.set('orders/TEST', {...h.records.get('orders/TEST'), status: 'mailed', fulfillmentStatus: 'mailed', paidAt: 'original'});
  await h.webhook('checkout.session.completed', session);
  assert.equal(h.records.get('orders/TEST').fulfillmentStatus, 'mailed');
  assert.equal(h.records.get('orders/TEST').paidAt, 'original');
  assert.equal(h.records.get('promotions/BETA').redemptionCount, 1);
});

test('expiration replay releases a reservation exactly once', async () => {
  const h = harness({'orders/TEST': {...order}, 'promotions/BETA': {reservationCount: 1}});
  await h.webhook('checkout.session.expired', session);
  await h.webhook('checkout.session.expired', session);
  assert.equal(h.records.get('promotions/BETA').reservationCount, 0);
  assert.equal(h.records.get('orders/TEST').promotionReservationStatus, 'released');
});

test('cleanup reaches reservations beyond 100 already-released orders', async () => {
  const initial = Object.fromEntries(Array.from({length: 100}, (_, i) => [`orders/OLD${i}`, {...order, promotionReservationStatus: 'released'}]));
  const h = harness({...initial, 'orders/TEST': {...order}, 'promotions/BETA': {reservationCount: 1}}, {cs_test_1: {status: 'expired'}});
  await h.functions.cleanupExpiredPromotionReservations();
  assert.equal(h.records.get('orders/TEST').promotionReservationStatus, 'released');
});

test('cleanup retains a completed payment awaiting its webhook', async () => {
  const h = harness({'orders/TEST': {...order}, 'promotions/BETA': {reservationCount: 1}}, {cs_test_1: {status: 'complete'}});
  await h.functions.cleanupExpiredPromotionReservations();
  assert.equal(h.records.get('orders/TEST').promotionReservationStatus, 'reserved');
  assert.equal(h.records.get('promotions/BETA').reservationCount, 1);
});
