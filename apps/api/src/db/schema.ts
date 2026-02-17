import { integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const shortLinkTable = pgTable("short_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar().notNull(),
  url: varchar().notNull(),
  clickCount: integer(),
  createdAt: timestamp().defaultNow(),
  expiredAt: timestamp(),
});
