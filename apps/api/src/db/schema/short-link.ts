import type { InferSelectModel } from "drizzle-orm";
import {
  integer,
  pgTable,
  varchar,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const shortLinkTable = pgTable("short_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar().notNull().unique(),
  url: varchar().notNull(),
  clickCount: integer().default(0),
  createdAt: timestamp().defaultNow(),
  expiredAt: timestamp().notNull(),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "cascade",
  }),
});

export type ShortLink = InferSelectModel<typeof shortLinkTable>;
