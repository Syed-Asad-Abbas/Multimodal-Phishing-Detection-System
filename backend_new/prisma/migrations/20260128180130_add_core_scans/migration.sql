-- CreateEnum
CREATE TYPE "core"."ScanStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "core"."scans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "url" TEXT NOT NULL,
    "status" "core"."ScanStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."scan_results" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "phishing_probability" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "scan_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."scan_shap_values" (
    "id" TEXT NOT NULL,
    "scan_result_id" TEXT NOT NULL,
    "feature_name" TEXT NOT NULL,
    "shap_value" DOUBLE PRECISION NOT NULL,
    "modality" TEXT NOT NULL,

    CONSTRAINT "scan_shap_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."scan_explanations" (
    "id" TEXT NOT NULL,
    "scan_result_id" TEXT NOT NULL,
    "llm_text" TEXT NOT NULL,

    CONSTRAINT "scan_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."scan_screenshots" (
    "id" TEXT NOT NULL,
    "scan_result_id" TEXT NOT NULL,
    "image_url" TEXT,
    "base64_data" TEXT,

    CONSTRAINT "scan_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."malicious_ip_observations" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "geo_lat" DOUBLE PRECISION,
    "geo_long" DOUBLE PRECISION,
    "country" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "malicious_ip_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_results_scan_id_key" ON "core"."scan_results"("scan_id");

-- CreateIndex
CREATE UNIQUE INDEX "scan_explanations_scan_result_id_key" ON "core"."scan_explanations"("scan_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "scan_screenshots_scan_result_id_key" ON "core"."scan_screenshots"("scan_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "malicious_ip_observations_scan_id_key" ON "core"."malicious_ip_observations"("scan_id");

-- AddForeignKey
ALTER TABLE "core"."scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."scan_results" ADD CONSTRAINT "scan_results_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "core"."scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."scan_shap_values" ADD CONSTRAINT "scan_shap_values_scan_result_id_fkey" FOREIGN KEY ("scan_result_id") REFERENCES "core"."scan_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."scan_explanations" ADD CONSTRAINT "scan_explanations_scan_result_id_fkey" FOREIGN KEY ("scan_result_id") REFERENCES "core"."scan_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."scan_screenshots" ADD CONSTRAINT "scan_screenshots_scan_result_id_fkey" FOREIGN KEY ("scan_result_id") REFERENCES "core"."scan_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."malicious_ip_observations" ADD CONSTRAINT "malicious_ip_observations_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "core"."scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
