-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('SUPERVISOR', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('REQUEST', 'RESPONSE');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'VIOLATION', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "AgentAuditLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "parentTraceId" TEXT,
    "agentType" "AgentType" NOT NULL,
    "specialistDomain" TEXT,
    "modelId" TEXT NOT NULL,
    "callDirection" "CallDirection" NOT NULL,
    "complianceStatus" "ComplianceStatus" NOT NULL,
    "violationType" TEXT,
    "policyRuleId" TEXT,
    "contentHash" TEXT NOT NULL,
    "contentSummary" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentAuditLog_sessionId_idx" ON "AgentAuditLog"("sessionId");

-- CreateIndex
CREATE INDEX "AgentAuditLog_traceId_idx" ON "AgentAuditLog"("traceId");

-- CreateIndex
CREATE INDEX "AgentAuditLog_complianceStatus_idx" ON "AgentAuditLog"("complianceStatus");

-- CreateIndex
CREATE INDEX "AgentAuditLog_createdAt_idx" ON "AgentAuditLog"("createdAt");
