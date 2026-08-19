import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_landing_content_features_icon" AS ENUM('counter', 'chart', 'record');
  CREATE TYPE "cms"."enum_landing_content_features_tone" AS ENUM('mint', 'purple', 'orange');
  CREATE TYPE "cms"."enum_landing_content_branches_cards_mockup" AS ENUM('transfer', 'expiry', 'stocktake', 'terminals');
  CREATE TABLE "cms"."cms_users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms"."cms_users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_wide_url" varchar,
  	"sizes_wide_width" numeric,
  	"sizes_wide_height" numeric,
  	"sizes_wide_mime_type" varchar,
  	"sizes_wide_filesize" numeric,
  	"sizes_wide_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "cms"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_users_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "cms"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_users_id" integer
  );
  
  CREATE TABLE "cms"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_nav" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_hero_ticker" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "cms"."enum_landing_content_features_icon" DEFAULT 'counter' NOT NULL,
  	"tone" "cms"."enum_landing_content_features_tone" DEFAULT 'mint' NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_counter_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_numbers_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_branches_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mockup" "cms"."enum_landing_content_branches_cards_mockup" DEFAULT 'transfer' NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_product_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_extras_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."landing_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"meta_title" varchar DEFAULT 'Sentry — POS and business monitoring for Philippine businesses' NOT NULL,
  	"meta_description" varchar DEFAULT 'A point-of-sale and analytics platform for PH stores and cafés. Ring sales, track stock and expiry, and see your profit — across every branch, every day.' NOT NULL,
  	"hero_badge" varchar DEFAULT 'Now onboarding pilot stores' NOT NULL,
  	"hero_headline" varchar DEFAULT 'Your business, always in sight.' NOT NULL,
  	"hero_sub" varchar DEFAULT 'Sentry is a point-of-sale and monitoring platform for Philippine stores — ring sales at the counter, then watch sales, profit, and stock across every branch from one dashboard.' NOT NULL,
  	"hero_primary_cta" varchar DEFAULT 'Sign in' NOT NULL,
  	"hero_secondary_cta" varchar DEFAULT 'Request access' NOT NULL,
  	"counter_eyebrow" varchar DEFAULT 'AT THE COUNTER' NOT NULL,
  	"counter_heading" varchar DEFAULT 'Fast enough for the morning rush.' NOT NULL,
  	"numbers_eyebrow" varchar DEFAULT 'THE NUMBERS' NOT NULL,
  	"numbers_heading" varchar DEFAULT 'Know what you made, not just what you sold.' NOT NULL,
  	"branches_heading" varchar DEFAULT 'Run every branch from wherever you are.' NOT NULL,
  	"product_eyebrow" varchar DEFAULT 'THE PRODUCT' NOT NULL,
  	"product_heading" varchar DEFAULT 'Every screen, one design language.' NOT NULL,
  	"product_sub" varchar DEFAULT 'Dense where you work fast, calm where you read numbers — the counter, the portal, and your phone all speak the same Sentry.' NOT NULL,
  	"extras_heading" varchar DEFAULT 'Also in the box' NOT NULL,
  	"banner_line" varchar DEFAULT 'Run your business in sight.' NOT NULL,
  	"banner_cta" varchar DEFAULT 'Request access' NOT NULL,
  	"contact_email" varchar DEFAULT 'codeboxstudios.official@gmail.com' NOT NULL,
  	"contact_website_url" varchar DEFAULT 'https://code-box-studios.vercel.app/' NOT NULL,
  	"contact_website_label" varchar DEFAULT 'code-box-studios.vercel.app' NOT NULL,
  	"contact_facebook_url" varchar DEFAULT 'https://www.facebook.com/codeboxstudios' NOT NULL,
  	"contact_facebook_label" varchar DEFAULT 'facebook.com/codeboxstudios' NOT NULL,
  	"footer_copyright" varchar DEFAULT '© 2026 Code Box Studios' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "cms"."cms_users_sessions" ADD CONSTRAINT "cms_users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cms_users_fk" FOREIGN KEY ("cms_users_id") REFERENCES "cms"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_cms_users_fk" FOREIGN KEY ("cms_users_id") REFERENCES "cms"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_nav" ADD CONSTRAINT "landing_content_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_hero_ticker" ADD CONSTRAINT "landing_content_hero_ticker_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_features" ADD CONSTRAINT "landing_content_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_counter_bullets" ADD CONSTRAINT "landing_content_counter_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_numbers_bullets" ADD CONSTRAINT "landing_content_numbers_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_branches_cards" ADD CONSTRAINT "landing_content_branches_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_product_captions" ADD CONSTRAINT "landing_content_product_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_extras_cards" ADD CONSTRAINT "landing_content_extras_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."landing_content_footer_links" ADD CONSTRAINT "landing_content_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."landing_content"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_users_sessions_order_idx" ON "cms"."cms_users_sessions" USING btree ("_order");
  CREATE INDEX "cms_users_sessions_parent_id_idx" ON "cms"."cms_users_sessions" USING btree ("_parent_id");
  CREATE INDEX "cms_users_updated_at_idx" ON "cms"."cms_users" USING btree ("updated_at");
  CREATE INDEX "cms_users_created_at_idx" ON "cms"."cms_users" USING btree ("created_at");
  CREATE UNIQUE INDEX "cms_users_email_idx" ON "cms"."cms_users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_wide_sizes_wide_filename_idx" ON "cms"."media" USING btree ("sizes_wide_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "cms"."media" USING btree ("sizes_card_filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "cms"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "cms"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "cms"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "cms"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "cms"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "cms"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "cms"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_cms_users_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("cms_users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "cms"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "cms"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "cms"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "cms"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "cms"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "cms"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_cms_users_id_idx" ON "cms"."payload_preferences_rels" USING btree ("cms_users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "cms"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "cms"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "landing_content_nav_order_idx" ON "cms"."landing_content_nav" USING btree ("_order");
  CREATE INDEX "landing_content_nav_parent_id_idx" ON "cms"."landing_content_nav" USING btree ("_parent_id");
  CREATE INDEX "landing_content_hero_ticker_order_idx" ON "cms"."landing_content_hero_ticker" USING btree ("_order");
  CREATE INDEX "landing_content_hero_ticker_parent_id_idx" ON "cms"."landing_content_hero_ticker" USING btree ("_parent_id");
  CREATE INDEX "landing_content_features_order_idx" ON "cms"."landing_content_features" USING btree ("_order");
  CREATE INDEX "landing_content_features_parent_id_idx" ON "cms"."landing_content_features" USING btree ("_parent_id");
  CREATE INDEX "landing_content_counter_bullets_order_idx" ON "cms"."landing_content_counter_bullets" USING btree ("_order");
  CREATE INDEX "landing_content_counter_bullets_parent_id_idx" ON "cms"."landing_content_counter_bullets" USING btree ("_parent_id");
  CREATE INDEX "landing_content_numbers_bullets_order_idx" ON "cms"."landing_content_numbers_bullets" USING btree ("_order");
  CREATE INDEX "landing_content_numbers_bullets_parent_id_idx" ON "cms"."landing_content_numbers_bullets" USING btree ("_parent_id");
  CREATE INDEX "landing_content_branches_cards_order_idx" ON "cms"."landing_content_branches_cards" USING btree ("_order");
  CREATE INDEX "landing_content_branches_cards_parent_id_idx" ON "cms"."landing_content_branches_cards" USING btree ("_parent_id");
  CREATE INDEX "landing_content_product_captions_order_idx" ON "cms"."landing_content_product_captions" USING btree ("_order");
  CREATE INDEX "landing_content_product_captions_parent_id_idx" ON "cms"."landing_content_product_captions" USING btree ("_parent_id");
  CREATE INDEX "landing_content_extras_cards_order_idx" ON "cms"."landing_content_extras_cards" USING btree ("_order");
  CREATE INDEX "landing_content_extras_cards_parent_id_idx" ON "cms"."landing_content_extras_cards" USING btree ("_parent_id");
  CREATE INDEX "landing_content_footer_links_order_idx" ON "cms"."landing_content_footer_links" USING btree ("_order");
  CREATE INDEX "landing_content_footer_links_parent_id_idx" ON "cms"."landing_content_footer_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."cms_users_sessions" CASCADE;
  DROP TABLE "cms"."cms_users" CASCADE;
  DROP TABLE "cms"."media" CASCADE;
  DROP TABLE "cms"."payload_kv" CASCADE;
  DROP TABLE "cms"."payload_locked_documents" CASCADE;
  DROP TABLE "cms"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "cms"."payload_preferences" CASCADE;
  DROP TABLE "cms"."payload_preferences_rels" CASCADE;
  DROP TABLE "cms"."payload_migrations" CASCADE;
  DROP TABLE "cms"."landing_content_nav" CASCADE;
  DROP TABLE "cms"."landing_content_hero_ticker" CASCADE;
  DROP TABLE "cms"."landing_content_features" CASCADE;
  DROP TABLE "cms"."landing_content_counter_bullets" CASCADE;
  DROP TABLE "cms"."landing_content_numbers_bullets" CASCADE;
  DROP TABLE "cms"."landing_content_branches_cards" CASCADE;
  DROP TABLE "cms"."landing_content_product_captions" CASCADE;
  DROP TABLE "cms"."landing_content_extras_cards" CASCADE;
  DROP TABLE "cms"."landing_content_footer_links" CASCADE;
  DROP TABLE "cms"."landing_content" CASCADE;
  DROP TYPE "cms"."enum_landing_content_features_icon";
  DROP TYPE "cms"."enum_landing_content_features_tone";
  DROP TYPE "cms"."enum_landing_content_branches_cards_mockup";`)
}
