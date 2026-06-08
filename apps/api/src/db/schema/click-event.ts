import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const clickEventTable = pgTable(
  "click_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar().notNull(),
    timestamp: timestamp().defaultNow().notNull(),
    userAgent: text("user_agent"),
    referer: text(),
  },
  (table) => [
    index("click_events_slug_idx").on(table.slug),
    index("click_events_slug_timestamp_idx").on(table.slug, table.timestamp),
  ],
);
