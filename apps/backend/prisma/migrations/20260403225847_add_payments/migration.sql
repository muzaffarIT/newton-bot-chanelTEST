/*
  Warnings:

  - The values [REJECTED] on the enum `RedemptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `updated_at` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `rewards` table. All the data in the column will be lost.
  - You are about to drop the column `stock_limit` on the `rewards` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `rewards` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `rewards` table. All the data in the column will be lost.
  - Added the required column `title_ru` to the `rewards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_uz` to the `rewards` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'NUMERIC', 'SHORT_TEXT');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DISCOUNT', 'MATERIAL', 'CONSULTATION', 'TRIAL_LESSON');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYME', 'CLICK', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "RedemptionStatus_new" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');
ALTER TABLE "redemptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "redemptions" ALTER COLUMN "status" TYPE "RedemptionStatus_new" USING ("status"::text::"RedemptionStatus_new");
ALTER TYPE "RedemptionStatus" RENAME TO "RedemptionStatus_old";
ALTER TYPE "RedemptionStatus_new" RENAME TO "RedemptionStatus";
DROP TYPE "RedemptionStatus_old";
ALTER TABLE "redemptions" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "redemptions" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "rewards" DROP COLUMN "description",
DROP COLUMN "stock_limit",
DROP COLUMN "title",
DROP COLUMN "updated_at",
ADD COLUMN     "description_ru" TEXT,
ADD COLUMN     "description_uz" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "stock_limits" INTEGER,
ADD COLUMN     "title_ru" TEXT NOT NULL,
ADD COLUMN     "title_uz" TEXT NOT NULL,
ADD COLUMN     "type" "RewardType" NOT NULL DEFAULT 'DISCOUNT';

-- AlterTable
ALTER TABLE "scheduled_posts" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'ru';

-- AlterTable
ALTER TABLE "test_questions" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'MCQ';

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receipt_url" TEXT,
    "note" TEXT,
    "confirmed_by" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
