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
  explanation?: string;
  detailedReason?: string;
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

  /**
   * Generate a human-readable explanation for why a violation occurred
   */
  static generateViolationExplanation(
    violationType: string | null | undefined,
    contentSummary: string | null | undefined,
    complianceStatus: string
  ): string {
    if (complianceStatus === 'COMPLIANT') {
      return 'This log passed all compliance checks and poses no medical safety risk.';
    }

    const explanations: Record<string, string> = {
      PRESCRIPTION_DETECTED:
        'The response contains prescription recommendations, which is not allowed. AI assistants cannot prescribe medications as this requires licensed medical professionals.',
      CONTROLLED_SUBSTANCE_DETECTED:
        'Controlled substances were detected in the content. Handling controlled substances requires professional medical oversight.',
      SELF_HARM_REQUEST:
        'The content contains references to self-harm or suicide. Medical safety protocols prohibit assisting with such requests.',
      DOSAGE_ADVICE_DETECTED:
        'Dosage recommendations or instructions were provided. Only licensed healthcare providers can advise on medication dosages.',
      ILLEGAL_ACTIVITY_DETECTED:
        'The content appears to reference illegal activities related to pharmaceuticals or medical services.',
      PROFESSIONAL_IMPERSONATION:
        'The response falsely claims medical professional status or diagnostic authority, which violates compliance rules.',
      DIAGNOSTIC_CLAIM:
        'The content makes definitive diagnostic claims about medical conditions, which should only come from licensed professionals.',
      NEEDS_REVIEW:
        'This interaction requires manual review as it contains potentially concerning elements that may violate compliance policies.',
    };

    return (
      explanations[violationType || ''] ||
      'This log triggered a compliance violation. Please review the detailed content for more information.'
    );
  }

  /**
   * Generate detailed trace information showing why rule was broken
   */
  static generateRuleBreakdownReason(violationType: string | null | undefined): string {
    const reasons: Record<string, string> = {
      PRESCRIPTION_DETECTED:
        'Rule: No medication prescriptions. Breaking reason: Medical prescription advice was provided in the response, violating the prohibition on prescriptive medical guidance.',
      CONTROLLED_SUBSTANCE_DETECTED:
        'Rule: No controlled substance handling. Breaking reason: Controlled substances or illegal drugs were mentioned or discussed in the content.',
      SELF_HARM_REQUEST:
        'Rule: Prohibition on self-harm assistance. Breaking reason: The request involves self-harm or suicidal content, immediately blocked for medical safety.',
      DOSAGE_ADVICE_DETECTED:
        'Rule: No dosage instructions. Breaking reason: Specific dosage or medication usage instructions were provided without medical oversight.',
      ILLEGAL_ACTIVITY_DETECTED:
        'Rule: No illegal pharmaceutical activity. Breaking reason: Content references obtaining, distributing, or using pharmaceuticals illegally.',
      PROFESSIONAL_IMPERSONATION:
        'Rule: No false medical credentials. Breaking reason: Response falsely claims to be from/represent a licensed medical professional.',
      DIAGNOSTIC_CLAIM:
        'Rule: No definitive diagnoses. Breaking reason: The response makes authoritative medical diagnoses without proper medical licensing.',
    };

    return (
      reasons[violationType || ''] ||
      'The compliance rule was triggered due to content that violates medical safety policies.'
    );
  }
}
