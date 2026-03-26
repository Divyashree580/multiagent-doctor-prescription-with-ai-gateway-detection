import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/audit/stats
 * Get compliance statistics and analytics
 * 
 * Query Parameters:
 *   - sessionId: Get stats for specific session
 *   - from: Start of time range (ISO 8601)
 *   - to: End of time range (ISO 8601)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let whereClause: any = {};

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    if (from || to) {
      whereClause.createdAt = {};
      if (from) {
        whereClause.createdAt.gte = new Date(from);
      }
      if (to) {
        whereClause.createdAt.lte = new Date(to);
      }
    }

    // Get all metrics in parallel for efficiency
    const [
      totalLogs,
      compliantCount,
      violationCount,
      needsReviewCount,
      blockedCount,
      byAgentType,
      byCallDirection,
      byViolationType,
      averageLatency,
      recentViolations,
    ] = await Promise.all([
      // Total logs
      prisma.agentAuditLog.count({ where: whereClause }),

      // Compliance status counts
      prisma.agentAuditLog.count({
        where: { ...whereClause, complianceStatus: 'COMPLIANT' },
      }),
      prisma.agentAuditLog.count({
        where: { ...whereClause, complianceStatus: 'VIOLATION' },
      }),
      prisma.agentAuditLog.count({
        where: { ...whereClause, complianceStatus: 'NEEDS_REVIEW' },
      }),
      prisma.agentAuditLog.count({
        where: { ...whereClause, blocked: true },
      }),

      // Grouped by agent type
      prisma.agentAuditLog.groupBy({
        by: ['agentType'],
        where: whereClause,
        _count: true,
      }),

      // Grouped by call direction
      prisma.agentAuditLog.groupBy({
        by: ['callDirection'],
        where: whereClause,
        _count: true,
      }),

      // Grouped by violation type
      prisma.agentAuditLog.groupBy({
        by: ['violationType'],
        where: {
          ...whereClause,
          complianceStatus: 'VIOLATION',
          violationType: { not: null },
        },
        _count: true,
      }),

      // Average latency
      prisma.agentAuditLog.aggregate({
        where: whereClause,
        _avg: { latencyMs: true },
      }),

      // Recent violations for quick review
      prisma.agentAuditLog.findMany({
        where: {
          ...whereClause,
          OR: [
            { complianceStatus: 'VIOLATION' },
            { complianceStatus: 'NEEDS_REVIEW' },
          ],
          blocked: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          sessionId: true,
          createdAt: true,
          agentType: true,
          complianceStatus: true,
          violationType: true,
          policyRuleId: true,
          blocked: true,
        },
      }),
    ]);

    // Calculate percentages
    const compliancePercentage = totalLogs > 0 ? ((compliantCount / totalLogs) * 100).toFixed(2) : 0;
    const violationPercentage = totalLogs > 0 ? ((violationCount / totalLogs) * 100).toFixed(2) : 0;
    const blockRate = totalLogs > 0 ? ((blockedCount / totalLogs) * 100).toFixed(2) : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          overview: {
            totalLogs,
            compliant: compliantCount,
            violations: violationCount,
            needsReview: needsReviewCount,
            blocked: blockedCount,
            compliancePercentage: parseFloat(compliancePercentage as any),
            violationPercentage: parseFloat(violationPercentage as any),
            blockRate: parseFloat(blockRate as any),
          },
          breakdown: {
            byAgentType: byAgentType.map((item) => ({
              agentType: item.agentType,
              count: item._count,
            })),
            byCallDirection: byCallDirection.map((item) => ({
              callDirection: item.callDirection,
              count: item._count,
            })),
            byViolationType: byViolationType.map((item) => ({
              violationType: item.violationType,
              count: item._count,
            })),
          },
          performance: {
            averageLatencyMs: averageLatency._avg.latencyMs || 0,
          },
          recentViolations: recentViolations,
        },
        query: {
          sessionId: sessionId || null,
          timeRange: {
            from: from || null,
            to: to || null,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit statistics',
      },
      { status: 500 }
    );
  }
}
