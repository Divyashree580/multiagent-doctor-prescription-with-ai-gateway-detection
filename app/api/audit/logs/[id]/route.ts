import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AuditLogger } from '@/lib/compliance/auditLogger';

/**
 * GET /api/audit/logs/:id
 * Retrieve a single audit log record by ID with detailed explanations and compliance details
 * 
 * Path Parameters:
 *   - id: The audit log ID (CUID format)
 * 
 * Response:
 *   - Detailed audit log entry
 *   - Compliance explanation
 *   - Related rules that were triggered
 *   - Trace information showing the flow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid audit log ID',
          message: 'Audit log ID must be a valid string',
        },
        { status: 400 }
      );
    }

    console.log(`Fetching audit log: ${id}`);

    // Fetch the audit log from database
    const log = await prisma.agentAuditLog.findUnique({
      where: { id },
    });

    if (!log) {
      console.warn(`Audit log not found: ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'AUDIT_LOG_NOT_FOUND',
          message: `Audit log with ID '${id}' not found`,
        },
        { status: 404 }
      );
    }

    console.log(`Found audit log: ${id}, status: ${log.complianceStatus}`);

    // Enrich the log with detailed explanations
    const enrichedLog = {
      id: log.id,
      sessionId: log.sessionId,
      traceId: log.traceId,
      parentTraceId: log.parentTraceId,
      agentType: log.agentType,
      specialistDomain: log.specialistDomain,
      modelId: log.modelId,
      callDirection: log.callDirection,
      complianceStatus: log.complianceStatus,
      violationType: log.violationType,
      policyRuleId: log.policyRuleId,
      contentHash: log.contentHash,
      contentSummary: log.contentSummary,
      latencyMs: log.latencyMs,
      blocked: log.blocked,
      createdAt: log.createdAt,
      
      // Enriched fields
      explanation: AuditLogger.generateViolationExplanation(
        log.violationType,
        log.contentSummary,
        log.complianceStatus
      ),
      reason: AuditLogger.generateRuleBreakdownReason(log.violationType),
      relatedRules: generateRelatedRules(log.violationType, log.complianceStatus),
      trace: generateTraceSteps(log.agentType, log.complianceStatus, log.violationType),
      
      // Compliance context
      complianceContext: {
        isCompliant: log.complianceStatus === 'COMPLIANT',
        needsReview: log.complianceStatus === 'NEEDS_REVIEW',
        isViolation: log.complianceStatus === 'VIOLATION',
        wasBlocked: log.blocked,
        riskLevel: calculateRiskLevel(log.complianceStatus, log.violationType),
      },
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
        error: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch audit log',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate risk level based on compliance status and violation type
 */
function calculateRiskLevel(
  complianceStatus: string,
  violationType: string | null | undefined
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (complianceStatus === 'VIOLATION') {
    // Critical violations
    if (violationType === 'SELF_HARM_REQUEST') return 'CRITICAL';
    if (violationType === 'PRESCRIPTION_DETECTED') return 'CRITICAL';
    if (violationType === 'CONTROLLED_SUBSTANCE_DETECTED') return 'CRITICAL';
    return 'HIGH';
  }
  
  if (complianceStatus === 'NEEDS_REVIEW') return 'MEDIUM';
  
  return 'LOW';
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
      description: 'AI cannot recommend or prescribe medications',
      triggered: violationType === 'PRESCRIPTION_DETECTED',
      riskLevel: 'CRITICAL',
      category: 'MEDICATION',
      reason: 'Prescriptions must come from licensed healthcare providers',
      action: 'Block recommendation and suggest consulting healthcare provider',
    },
    {
      ruleId: 'RULE_002',
      ruleName: 'Controlled Substances Prohibition',
      description: 'No discussion of illegal or controlled substance handling',
      triggered: violationType === 'CONTROLLED_SUBSTANCE_DETECTED',
      riskLevel: 'CRITICAL',
      category: 'LEGAL',
      reason: 'Controlled substances require proper legal and medical authorization',
      action: 'Block content and report if necessary',
    },
    {
      ruleId: 'RULE_003',
      ruleName: 'Self-Harm Prevention',
      description: 'Content containing self-harm or suicide prevention',
      triggered: violationType === 'SELF_HARM_REQUEST',
      riskLevel: 'CRITICAL',
      category: 'SAFETY',
      reason: 'Content containing self-harm or suicide must be blocked immediately',
      action: 'Block content, log incident, provide mental health resources',
    },
    {
      ruleId: 'RULE_004',
      ruleName: 'No Dosage Instructions',
      description: 'Medication dosage can only be provided by licensed professionals',
      triggered: violationType === 'DOSAGE_ADVICE_DETECTED',
      riskLevel: 'CRITICAL',
      category: 'MEDICATION',
      reason: 'Incorrect dosage information can cause serious harm',
      action: 'Block dosage recommendations and refer to healthcare provider',
    },
    {
      ruleId: 'RULE_005',
      ruleName: 'Professional Authenticity',
      description: 'AI cannot impersonate licensed medical professionals',
      triggered: violationType === 'PROFESSIONAL_IMPERSONATION',
      riskLevel: 'HIGH',
      category: 'SAFETY',
      reason: 'Impersonation violates regulatory requirements and patient trust',
      action: 'Remove impersonation claims and establish AI limitations',
    },
    {
      ruleId: 'RULE_101',
      ruleName: 'Drug + Dosage Combination',
      description: 'No combination of drug names with dosage information',
      triggered: violationType === 'DRUG_DOSAGE_COMBINATION',
      riskLevel: 'CRITICAL',
      category: 'MEDICATION',
      reason: 'Combined drug and dosage information is prescriptive',
      action: 'Block medicine recommendation',
    },
    {
      ruleId: 'RULE_102',
      ruleName: 'Prescriptive Language Detection',
      description: 'No use of prescriptive clinical language',
      triggered: violationType === 'PRESCRIPTIVE_LANGUAGE_DETECTED',
      riskLevel: 'HIGH',
      category: 'LANGUAGE',
      reason: 'Prescriptive language implies treatment guidance from AI',
      action: 'Reword response using advisory language instead',
    },
    {
      ruleId: 'RULE_103',
      ruleName: 'Definitive Diagnosis Detection',
      description: 'Diagnoses must be properly hedged (could, might, may)',
      triggered: violationType === 'FIRM_DIAGNOSIS_DETECTED',
      riskLevel: 'MEDIUM',
      category: 'DIAGNOSIS',
      reason: 'Firm diagnoses without hedging imply certainty AI cannot provide',
      action: 'Require appropriate hedging language (might, could, may)',
    },
    {
      ruleId: 'RULE_104',
      ruleName: 'Dosage Modification Advice',
      description: 'No advice on modifying existing medication dosages',
      triggered: violationType === 'DOSAGE_MODIFICATION_DETECTED',
      riskLevel: 'CRITICAL',
      category: 'MEDICATION',
      reason: 'Dosage changes require medical supervision',
      action: 'Block modification advice and refer to healthcare provider',
    },
    {
      ruleId: 'RULE_105',
      ruleName: 'Treatment-Intent Recommendation',
      description: 'No treatment-focused medicine recommendations',
      triggered: violationType === 'TREATMENT_RECOMMENDATION_DETECTED',
      riskLevel: 'HIGH',
      category: 'MEDICATION',
      reason: 'Treatment recommendations require professional medical judgment',
      action: 'Provide informational context only, no treatment advice',
    },
  ];

  // Filter rules that are relevant or triggered
  const relevantRules = rules.filter(
    rule => rule.triggered || complianceStatus === 'NEEDS_REVIEW'
  );

  return relevantRules.length > 0 ? relevantRules : rules.slice(0, 3);
}

/**
 * Generate trace steps showing the flow of the request
 */
function generateTraceSteps(
  agentType: string,
  complianceStatus: string,
  violationType: string | null | undefined
) {
  const steps: any[] = [];

  // Step 1: Request received
  steps.push({
    step: 1,
    timestamp: new Date().toISOString(),
    event: 'REQUEST_RECEIVED',
    description: `${agentType} agent received request`,
    status: 'COMPLETED',
  });

  // Step 2: Compliance check
  steps.push({
    step: 2,
    timestamp: new Date().toISOString(),
    event: 'COMPLIANCE_CHECK',
    description: 'Compliance analysis performed',
    status: complianceStatus === 'VIOLATION' ? 'FAILED' : 'PASSED',
    violationType: violationType || null,
  });

  // Step 3: Blocking (if violation)
  if (complianceStatus === 'VIOLATION') {
    steps.push({
      step: 3,
      timestamp: new Date().toISOString(),
      event: 'CONTENT_BLOCKED',
      description: `Content blocked due to ${violationType || 'compliance violation'}`,
      status: 'COMPLETED',
    });
  }

  // Step 4: Audit logged
  steps.push({
    step: 3,
    timestamp: new Date().toISOString(),
    event: 'AUDIT_LOGGED',
    description: 'Compliance event logged to audit trail',
    status: 'COMPLETED',
  });

  return steps;
}
