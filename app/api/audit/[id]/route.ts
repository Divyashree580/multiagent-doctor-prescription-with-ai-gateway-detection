import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AuditLogger } from '@/lib/compliance/auditLogger';

/**
 * GET /api/audit/logs/:id
 * Retrieve a single audit log record by ID with detailed explanations
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

    // Enrich the log with detailed explanations and reasons
    const enrichedLog = {
      ...log,
      explanation: AuditLogger.generateViolationExplanation(
        log.violationType,
        log.contentSummary,
        log.complianceStatus
      ),
      reason: AuditLogger.generateRuleBreakdownReason(log.violationType),
      // Add related rules information
      relatedRules: generateRelatedRules(log.violationType, log.complianceStatus),
      // Add trace information
      trace: generateTraceSteps(log.complianceStatus, log.violationType),
    };

    return NextResponse.json(
      {
        success: true,
        data: enrichedLog,
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

/**
 * Generate related compliance rules for a violation
 */
function generateRelatedRules(
  violationType: string | null | undefined,
  complianceStatus: string
) {
  const rules = [
    {
      ruleId: 'RULE_001',
      ruleName: 'No Prescription Recommendations',
      triggered: violationType === 'PRESCRIPTION_DETECTED',
      reason: 'AI cannot prescribe medications - requires licensed healthcare provider',
    },
    {
      ruleId: 'RULE_002',
      ruleName: 'Controlled Substances Prohibition',
      triggered: violationType === 'CONTROLLED_SUBSTANCE_DETECTED',
      reason: 'No discussion of illegal or controlled substance handling',
    },
    {
      ruleId: 'RULE_003',
      ruleName: 'Self-Harm Prevention',
      triggered: violationType === 'SELF_HARM_REQUEST',
      reason: 'Content containing self-harm or suicide must be blocked immediately',
    },
    {
      ruleId: 'RULE_004',
      ruleName: 'No Dosage Instructions',
      triggered: violationType === 'DOSAGE_ADVICE_DETECTED',
      reason: 'Medication dosage can only be provided by licensed professionals',
    },
    {
      ruleId: 'RULE_005',
      ruleName: 'Professional Authenticity',
      triggered: violationType === 'PROFESSIONAL_IMPERSONATION',
      reason: 'AI cannot impersonate licensed medical professionals',
    },
    {
      ruleId: 'RULE_006',
      ruleName: 'No Definitive Diagnoses',
      triggered: violationType === 'DIAGNOSTIC_CLAIM',
      reason: 'Medical diagnoses must come from qualified professionals only',
    },
    {
      ruleId: 'RULE_007',
      ruleName: 'No Illegal Activity',
      triggered: violationType === 'ILLEGAL_ACTIVITY_DETECTED',
      reason: 'Cannot assist with illegal pharmaceutical or medical activities',
    },
  ];

  return rules;
}

/**
 * Generate compliance check trace steps showing the verification process
 */
function generateTraceSteps(complianceStatus: string, violationType: string | null | undefined) {
  const baseSteps = [
    {
      step: 1,
      action: 'Content Ingestion',
      result: 'SUCCESS',
      details: 'Agent response received and scheduled for compliance check',
    },
    {
      step: 2,
      action: 'Text Analysis',
      result: 'SUCCESS',
      details: 'Content processed through medical safety detector for pattern matching',
    },
    {
      step: 3,
      action: 'Rule Matching',
      result: complianceStatus === 'COMPLIANT' ? 'SUCCESS' : 'VIOLATION_FOUND',
      details:
        complianceStatus === 'COMPLIANT'
          ? 'Content passed all compliance rules'
          : `Violation detected: ${violationType}`,
    },
  ];

  if (complianceStatus !== 'COMPLIANT') {
    baseSteps.push({
      step: 4,
      action: 'Violation Classification',
      result: 'VIOLATION_CLASSIFIED',
      details: `Violation type: ${violationType} - Content blocked due to medical safety concern`,
    });
  }

  return baseSteps;
}
