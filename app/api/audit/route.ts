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
    const [logs, total] = await Promise.all([
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
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit logs',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit/logs
 * Create a new audit log entry (internal use only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      sessionId,
      traceId,
      parentTraceId,
      agentType,
      specialistDomain,
      modelId,
      callDirection,
      complianceStatus,
      violationType,
      policyRuleId,
      contentHash,
      contentSummary,
      latencyMs,
      blocked,
    } = body;

    // Validate required fields
    if (!sessionId || !traceId || !agentType || !modelId || !callDirection || !complianceStatus || !contentHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const log = await prisma.agentAuditLog.create({
      data: {
        sessionId,
        traceId,
        parentTraceId: parentTraceId || null,
        agentType,
        specialistDomain: specialistDomain || null,
        modelId,
        callDirection,
        complianceStatus,
        violationType: violationType || null,
        policyRuleId: policyRuleId || null,
        contentHash,
        contentSummary: contentSummary || null,
        latencyMs,
        blocked: blocked || false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: log,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create audit log',
      },
      { status: 500 }
    );
  }
}
