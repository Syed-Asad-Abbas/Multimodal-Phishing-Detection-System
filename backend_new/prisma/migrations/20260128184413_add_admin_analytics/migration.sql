-- CreateTable
CREATE TABLE "admin"."audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."daily_scan_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total_scans" INTEGER NOT NULL DEFAULT 0,
    "benign_count" INTEGER NOT NULL DEFAULT 0,
    "phishing_count" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_scan_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."model_metrics_daily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "false_positive_rate" DOUBLE PRECISION,
    "true_positive_rate" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "total_samples" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "model_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_scan_stats_date_key" ON "analytics"."daily_scan_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "model_metrics_daily_date_key" ON "analytics"."model_metrics_daily"("date");
