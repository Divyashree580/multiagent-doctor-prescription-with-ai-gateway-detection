import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/audit/logs/:id
 * Retrieve a single audit log record by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const log = await prisma.agentAuditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: 'Audit log not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: log,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit log',
      },
      { status: 500 }
    );
  }
}
