import { timestamp } from "drizzle-orm/pg-core";

type Timestamps = {
  updated_at: ReturnType<typeof timestamp>;
  created_at: ReturnType<typeof timestamp>;
  deleted_at: ReturnType<typeof timestamp>;
};

export const timestamps = {
  updated_at: timestamp("updated_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
};
