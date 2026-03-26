import crypto from 'crypto';
import prisma from '../db';

export type AgentType = 'SUPERVISOR' | 'SPECIALIST';
export type CallDirection = 'REQUEST' | 'RESPONSE';
export type ComplianceStatus = 'COMPLIANT' | 'VIOLATION' | 'NEEDS_REVIEW';

export interface LogEntry {
  sessionId: string;
  traceId: string;
  parentTraceId?: string;
  agentType: AgentType;
  specialistDomain?: string;
  modelId: string;
  callDirection: CallDirection;
  complianceStatus: ComplianceStatus;
  violationType?: string;
  policyRuleId?: string;
  rawContent: string;
  contentSummary?: string;
  latencyMs: number;
  blocked: boolean;
}

/**
 * Log an agent call asynchronously without blocking
 * @param entry Log entry to create
 */
export async function logAgentCall(entry: LogEntry) {
  const contentHash = crypto.createHash('sha256').update(entry.rawContent).digest('hex');

  // Fire and forget - don't block the main request
  prisma.agentAuditLog.create({
    data: {
      sessionId: entry.sessionId,
      traceId: entry.traceId,
      parentTraceId: entry.parentTraceId || null,
      agentType: entry.agentType,
      specialistDomain: entry.specialistDomain || null,
      modelId: entry.modelId,
      callDirection: entry.callDirection,
      complianceStatus: entry.complianceStatus,
      violationType: entry.violationType || null,
      policyRuleId: entry.policyRuleId || null,
      contentHash,
      contentSummary: entry.contentSummary || null,
      latencyMs: entry.latencyMs,
      blocked: entry.blocked,
    }
  }).catch((err: Error) => {
    console.error("Failed to write audit log asynchronously:", err);
  });
}

/**
 * Utility class for advanced audit logging and querying
 */
export class AuditLogger {
  /**
   * Generate SHA-256 hash of content
   */
  static generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get audit logs for a session
   */
  static async getSessionLogs(sessionId: string, limit = 50) {
    return prisma.agentAuditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get violations for a session
   */
  static async getSessionViolations(sessionId: string, blockedOnly = false) {
    return prisma.agentAuditLog.findMany({
      where: {
        sessionId,
        OR: [
          { complianceStatus: 'VIOLATION' },
          { complianceStatus: 'NEEDS_REVIEW' },
        ],
        ...(blockedOnly && { blocked: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get statistics for a session
   */
  static async getSessionStatistics(sessionId: string) {
    const [compliant, violations, needsReview, blocked] = await Promise.all([
      prisma.agentAuditLog.count({
        where: { sessionId, complianceStatus: 'COMPLIANT' },
      }),
      prisma.agentAuditLog.count({
        where: { sessionId, complianceStatus: 'VIOLATION' },
      }),
      prisma.agentAuditLog.count({
        where: { sessionId, complianceStatus: 'NEEDS_REVIEW' },
      }),
      prisma.agentAuditLog.count({
        where: { sessionId, blocked: true },
      }),
    ]);

    return {
      compliant,
      violations,
      needsReview,
      blocked,
      total: compliant + violations + needsReview,
    };
  }

  /**
   * Get violations across all sessions within a time range
   */
  static async getViolationsByDateRange(from: Date, to: Date, limit = 100) {
    return prisma.agentAuditLog.findMany({
      where: {
        OR: [
          { complianceStatus: 'VIOLATION' },
          { complianceStatus: 'NEEDS_REVIEW' },
        ],
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get statistics for violations across a time range
   */
  static async getViolationStatistics(from: Date, to: Date) {
    const [totalViolations, blocked, byType, byAgent] = await Promise.all([
      prisma.agentAuditLog.count({
        where: {
          OR: [
            { complianceStatus: 'VIOLATION' },
            { complianceStatus: 'NEEDS_REVIEW' },
          ],
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.agentAuditLog.count({
        where: {
          OR: [
            { complianceStatus: 'VIOLATION' },
            { complianceStatus: 'NEEDS_REVIEW' },
          ],
          blocked: true,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.agentAuditLog.groupBy({
        by: ['violationType'],
        where: {
          complianceStatus: 'VIOLATION',
          createdAt: { gte: from, lte: to },
        },
        _count: true,
      }),
      prisma.agentAuditLog.groupBy({
        by: ['agentType'],
        where: {
          OR: [
            { complianceStatus: 'VIOLATION' },
            { complianceStatus: 'NEEDS_REVIEW' },
          ],
          createdAt: { gte: from, lte: to },
        },
        _count: true,
      }),
    ]);

    return {
      totalViolations,
      blocked,
      byViolationType: byType.map((item) => ({
        type: item.violationType,
        count: item._count,
      })),
      byAgentType: byAgent.map((item) => ({
        agentType: item.agentType,
        count: item._count,
      })),
    };
  }
}
