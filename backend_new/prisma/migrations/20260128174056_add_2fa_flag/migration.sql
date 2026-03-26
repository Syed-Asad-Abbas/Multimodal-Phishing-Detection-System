-- AlterTable
ALTER TABLE "auth"."users" ADD COLUMN     "is_2fa_enabled" BOOLEAN NOT NULL DEFAULT false;
