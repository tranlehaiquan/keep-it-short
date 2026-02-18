ALTER TABLE "short_links" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "short_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "short_links" ALTER COLUMN "clickCount" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "short_links" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_slug_unique" UNIQUE("slug");