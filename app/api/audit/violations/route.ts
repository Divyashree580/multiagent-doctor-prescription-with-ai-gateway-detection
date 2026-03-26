import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/audit/violations
 * Retrieve only violation and needs_review records
 * 
 * Query Parameters:
 *   - sessionId: Filter by session
 *   - agentType: Filter by agent type (SUPERVISOR | SPECIALIST)
 *   - violationType: Filter by violation type
 *   - from: Start of time range (ISO 8601)
 *   - to: End of time range (ISO 8601)
 *   - page: Page number (default: 1)
 *   - limit: Records per page, max 100 (default: 20)
 *   - blockedOnly: If true, only return blocked violations (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const sessionId = searchParams.get('sessionId');
    const agentType = searchParams.get('agentType');
    const violationType = searchParams.get('violationType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const blockedOnly = searchParams.get('blockedOnly') === 'true';

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      OR: [
        { complianceStatus: 'VIOLATION' },
        { complianceStatus: 'NEEDS_REVIEW' },
      ],
    };

    if (blockedOnly) {
      where.blocked = true;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (agentType) {
      where.agentType = agentType.toUpperCase();
    }

    if (violationType) {
      where.violationType = violationType;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    // Execute query
    const [violations, total] = await Promise.all([
      prisma.agentAuditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.agentAuditLog.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: violations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalViolations: total,
          blockedViolations: await prisma.agentAuditLog.count({
            where: { ...where, blocked: true },
          }),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching violations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch violations',
      },
      { status: 500 }
    );
  }
}
