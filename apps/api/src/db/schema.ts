import type { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const shortLinkTable = pgTable("short_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar().notNull().unique(),
  url: varchar().notNull(),
  clickCount: integer().default(0),
  createdAt: timestamp().defaultNow(),
  expiredAt: timestamp().notNull(),
});

export type ShortLink = InferSelectModel<typeof shortLinkTable>;
