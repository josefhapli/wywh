export const POSTCARD_PRICE_CENTS = 299;

// Temporary closed-beta promotions for immediate UI feedback. Firebase
// Functions remains the source of truth for all pricing and promo enforcement.
const PROMOTIONS = {
  TEST2026: {
    discountCents: POSTCARD_PRICE_CENTS,
    description: "Beta promotion applied — your postcard is free."
  }
};

export function getPromotion(code) {
  const normalizedCode = code.trim().toUpperCase();
  const promotion = PROMOTIONS[normalizedCode];

  if (!promotion) return null;

  return {
    code: normalizedCode,
    ...promotion,
    totalCents: Math.max(POSTCARD_PRICE_CENTS - promotion.discountCents, 0)
  };
}
