-- AlterEnum
ALTER TYPE "IncidentStatus" RENAME VALUE 'ANALYZING' TO 'ACKNOWLEDGED';

-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('MANUAL_CHECK', 'BATCH_CHECK', 'MONITORING_CRON');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('INTERNET', 'POWER', 'DEVICE', 'DVR', 'NVR', 'FACIAL', 'CAMERA', 'ROUTER', 'SWITCH', 'SERVER', 'UNKNOWN');

-- Preserve the original incident start timestamp.
ALTER TABLE "Incident" RENAME COLUMN "openedAt" TO "startedAt";

-- AlterTable
ALTER TABLE "Incident"
ADD COLUMN "previousStatus" "DeviceStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "currentStatus" "DeviceStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "source" "IncidentSource" NOT NULL DEFAULT 'MANUAL_CHECK',
ADD COLUMN "category" "IncidentCategory",
ADD COLUMN "aiSummary" TEXT;

-- Backfill tracking fields for incidents created before this migration.
UPDATE "Incident"
SET "lastSeenAt" = COALESCE("resolvedAt", "updatedAt", "startedAt", CURRENT_TIMESTAMP),
    "currentStatus" = CASE
      WHEN "status" = 'RESOLVED' THEN 'ONLINE'::"DeviceStatus"
      ELSE "currentStatus"
    END;

ALTER TABLE "Incident"
ALTER COLUMN "lastSeenAt" SET NOT NULL,
ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Keep the newest active incident and preserve older duplicates as resolved.
WITH ranked_incidents AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "deviceId"
      ORDER BY "startedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS position
  FROM "Incident"
  WHERE "deviceId" IS NOT NULL
    AND "status" IN ('OPEN', 'ACKNOWLEDGED')
)
UPDATE "Incident" AS incident
SET "status" = 'RESOLVED',
    "currentStatus" = 'ONLINE'::"DeviceStatus",
    "resolvedAt" = COALESCE(incident."resolvedAt", CURRENT_TIMESTAMP),
    "lastSeenAt" = GREATEST(incident."lastSeenAt", CURRENT_TIMESTAMP)
FROM ranked_incidents
WHERE incident."id" = ranked_incidents."id"
  AND ranked_incidents.position > 1;

-- CreateIndex
CREATE INDEX "Incident_deviceId_status_idx" ON "Incident"("deviceId", "status");

-- CreateIndex
CREATE INDEX "Incident_status_startedAt_idx" ON "Incident"("status", "startedAt");

-- CreateIndex
CREATE INDEX "Incident_resolvedAt_idx" ON "Incident"("resolvedAt");

-- Enforce a single active incident per monitored device.
CREATE UNIQUE INDEX "Incident_one_active_per_device_idx"
ON "Incident"("deviceId")
WHERE "deviceId" IS NOT NULL
  AND "status" IN ('OPEN', 'ACKNOWLEDGED');
