-- CreateTable
CREATE TABLE "mlops"."pipeline_health_logs" (
    "id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "error_details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mlops"."retraining_jobs" (
    "id" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "metrics_summary" TEXT,

    CONSTRAINT "retraining_jobs_pkey" PRIMARY KEY ("id")
);
