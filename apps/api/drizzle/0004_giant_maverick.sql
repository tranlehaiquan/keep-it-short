CREATE TABLE "click_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "click_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"referer" text
);
--> statement-breakpoint
CREATE INDEX "click_events_slug_idx" ON "click_events" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "click_events_slug_timestamp_idx" ON "click_events" USING btree ("slug","timestamp");
