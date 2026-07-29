export const ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  PRINTING: "printing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus =
  typeof ORDER_STATUS[keyof typeof ORDER_STATUS];