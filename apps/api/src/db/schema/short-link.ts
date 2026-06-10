import type { InferSelectModel } from "drizzle-orm";
import {
  integer,
  pgTable,
  varchar,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const shortLinkTable = pgTable(
  "short_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar().notNull().unique(),
    url: varchar().notNull(),
    clickCount: integer().default(0),
    createdAt: timestamp().defaultNow(),
    expiredAt: timestamp().notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "cascade",
    }),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),
  },
  (table) => ({
    createdByIdx: index("short_links_created_by_idx").on(table.createdBy),
  }),
);

export type ShortLink = InferSelectModel<typeof shortLinkTable>;
