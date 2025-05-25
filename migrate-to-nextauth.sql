-- Migration script to update database for NextAuth.js compatibility
-- This script will:
-- 1. Create new NextAuth tables with correct schema
-- 2. Migrate existing user data
-- 3. Drop old tables (commented out for safety)

-- Create new NextAuth-compatible tables
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL,
  "emailVerified" timestamp,
  "image" text,
  "password" varchar(64)
);

CREATE TABLE IF NOT EXISTS "account" (
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Migrate existing user data from User table to user table
-- Convert UUID to text and preserve existing data
INSERT INTO "user" ("id", "email", "password")
SELECT 
  "id"::text,
  "email",
  "password"
FROM "User"
ON CONFLICT ("id") DO NOTHING;

-- Update Chat table to reference new user table
-- First, add a new column with text type
ALTER TABLE "Chat" ADD COLUMN "userId_new" text;

-- Update the new column with converted UUIDs
UPDATE "Chat" SET "userId_new" = "userId"::text;

-- Drop the old foreign key constraint
ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_userId_User_id_fk";

-- Drop the old column
ALTER TABLE "Chat" DROP COLUMN "userId";

-- Rename the new column
ALTER TABLE "Chat" RENAME COLUMN "userId_new" TO "userId";

-- Add the new foreign key constraint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;

-- Update other tables that reference User
-- Update Document table
ALTER TABLE "Document" ADD COLUMN "userId_new" text;
UPDATE "Document" SET "userId_new" = "userId"::text;
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_userId_User_id_fk";
ALTER TABLE "Document" DROP COLUMN "userId";
ALTER TABLE "Document" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;

-- Update Suggestion table
ALTER TABLE "Suggestion" ADD COLUMN "userId_new" text;
UPDATE "Suggestion" SET "userId_new" = "userId"::text;
ALTER TABLE "Suggestion" DROP CONSTRAINT IF EXISTS "Suggestion_userId_User_id_fk";
ALTER TABLE "Suggestion" DROP COLUMN "userId";
ALTER TABLE "Suggestion" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;

-- Drop old tables (uncomment when ready)
-- DROP TABLE IF EXISTS "User";
-- DROP TABLE IF EXISTS "Account";
-- DROP TABLE IF EXISTS "Session";
-- DROP TABLE IF EXISTS "VerificationToken";
