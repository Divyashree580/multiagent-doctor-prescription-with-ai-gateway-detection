import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/audit/sessions/:sessionId
 * Retrieve all audit logs for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.agentAuditLog.findMany({
        where: { sessionId },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.agentAuditLog.count({ where: { sessionId } }),
    ]);

    if (logs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No logs found for this session',
        },
        { status: 404 }
      );
    }

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
    console.error('Error fetching session logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session logs',
      },
      { status: 500 }
    );
  }
}
