CREATE TABLE "short_links" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" varchar,
	"url" varchar,
	"clickCount" integer,
	"createdAt" timestamp,
	"expiredAt" timestamp
);
