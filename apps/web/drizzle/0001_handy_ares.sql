ALTER TABLE "discuno_user_profile" DROP CONSTRAINT "discuno_user_profile_edu_email_unique";--> statement-breakpoint
ALTER TABLE "discuno_account" DROP CONSTRAINT "discuno_account_user_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_calcom_token" DROP CONSTRAINT "discuno_calcom_token_user_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_mentor_review" DROP CONSTRAINT "discuno_mentor_review_mentor_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_mentor_review" DROP CONSTRAINT "discuno_mentor_review_user_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_session" DROP CONSTRAINT "discuno_session_user_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_user_major" DROP CONSTRAINT "discuno_user_major_user_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_user_profile" DROP CONSTRAINT "discuno_user_profile_user_id_discuno_user_id_fk";
--> statement-breakpoint
ALTER TABLE "discuno_user_school" DROP CONSTRAINT "discuno_user_school_user_id_discuno_user_id_fk";
--> statement-breakpoint
DROP INDEX "edu_email_user_id_idx";--> statement-breakpoint
ALTER TABLE "discuno_calcom_token" ADD COLUMN "calcom_username" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "discuno_account" ADD CONSTRAINT "discuno_account_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_calcom_token" ADD CONSTRAINT "discuno_calcom_token_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_mentor_review" ADD CONSTRAINT "discuno_mentor_review_mentor_id_discuno_user_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_mentor_review" ADD CONSTRAINT "discuno_mentor_review_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_session" ADD CONSTRAINT "discuno_session_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_user_major" ADD CONSTRAINT "discuno_user_major_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_user_profile" ADD CONSTRAINT "discuno_user_profile_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discuno_user_school" ADD CONSTRAINT "discuno_user_school_user_id_discuno_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."discuno_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calcom_tokens_username_idx" ON "discuno_calcom_token" USING btree ("calcom_username");--> statement-breakpoint
ALTER TABLE "discuno_user_profile" DROP COLUMN "edu_email";--> statement-breakpoint
ALTER TABLE "discuno_user_profile" DROP COLUMN "is_edu_verified";