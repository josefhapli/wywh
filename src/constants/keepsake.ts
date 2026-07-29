export const KEEPSAKE_STATUS = {
  DRAFT: "draft",
  READY: "ready",
  ORDERED: "ordered",
} as const;

export type KeepsakeStatus =
  typeof KEEPSAKE_STATUS[keyof typeof KEEPSAKE_STATUS];