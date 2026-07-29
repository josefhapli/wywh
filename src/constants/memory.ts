export const MEMORY_STATUS = {
  DRAFT: "draft",
  READY: "ready",
  ARCHIVED: "archived",
} as const;

export type MemoryStatus =
  typeof MEMORY_STATUS[keyof typeof MEMORY_STATUS];