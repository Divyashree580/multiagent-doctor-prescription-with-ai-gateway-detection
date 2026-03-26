import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/audit/logs
 * Query audit logs with optional filters
 * 
 * Query Parameters:
 *   - sessionId: Filter by session
 *   - agentType: Filter by agent type (SUPERVISOR | SPECIALIST)
 *   - complianceStatus: Filter by compliance status (COMPLIANT | VIOLATION | NEEDS_REVIEW)
 *   - violationType: Filter by violation type
 *   - from: Start of time range (ISO 8601)
 *   - to: End of time range (ISO 8601)
 *   - page: Page number (default: 1)
 *   - limit: Records per page, max 100 (default: 20)
 * 
 * Response:
 *   - paginated list of audit logs
 *   - total count of matching records
 *   - pagination metadata
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const sessionId = searchParams.get('sessionId');
    const agentType = searchParams.get('agentType');
    const complianceStatus = searchParams.get('complianceStatus');
    const violationType = searchParams.get('violationType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (agentType) {
      where.agentType = agentType.toUpperCase();
    }

    if (complianceStatus) {
      where.complianceStatus = complianceStatus.toUpperCase();
    }

    if (violationType) {
      where.violationType = violationType;
    }

    // Date range filtering
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    console.log('Fetching audit logs with filters:', where);

    // Fetch total count for pagination
    const total = await prisma.agentAuditLog.count({ where });

    // Fetch paginated results
    const logs = await prisma.agentAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    console.log(`Fetched ${logs.length} audit logs, total: ${total}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1,
          },
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch audit logs',
      },
      { status: 500 }
    );
  }
}
