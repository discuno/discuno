import { timestamp } from "drizzle-orm/pg-core";

type Timestamps = {
  updated_at: ReturnType<typeof timestamp>;
  created_at: ReturnType<typeof timestamp>;
  deleted_at: ReturnType<typeof timestamp>;
};

export const timestamps = {
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
