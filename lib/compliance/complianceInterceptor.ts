// lib/compliance/complianceInterceptor.ts
/**
 * Compliance Interceptor Integration Guide
 * 
 * This file demonstrates how to integrate the compliance check system
 * with the audit logging endpoints, medical safety detection,
 * and request/response parsing.
 * 
 * For full implementation, combine this with the auditLogger service,
 * MedicalSafetyDetector, and RequestResponseParser.
 */

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import { supervisorAgent } from "@/deep-agent/supervisiorAgent";
import prisma from "@/lib/db";

import { logAgentCall, AuditLogger } from './auditLogger';
import { MedicalSafetyDetector } from './medicalSafetyDetector';
import { RequestResponseParser } from './requestResponseParser';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session Management
 */
export class ComplianceInterceptor {
  private sessionId: string;
  private traceId: string;

  constructor() {
    this.sessionId = uuidv4(); // Generate per user session
    this.traceId = uuidv4(); // Generate per query
  }

  /**
   * Check request compliance before routing to agents
   * Parses request for medical context and detects safety violations
   */
  async checkRequestCompliance(userMessage: string, modelId: string) {
    const startTime = Date.now();

    try {
      // Parse the request to extract medical context
      const medicalContext = RequestResponseParser.parseRequest(userMessage);

      // Analyze for medical safety violations
      const safetyAnalysis = MedicalSafetyDetector.analyzeRequest(userMessage);

      // Determine compliance status
      const complianceStatus = MedicalSafetyDetector.determineComplianceStatus(safetyAnalysis);
      const policyRuleId = MedicalSafetyDetector.getPolicyRuleId(safetyAnalysis.violations);

      // Generate content summary (non-PHI)
      const contentSummary = MedicalSafetyDetector.generateContentSummary(
        userMessage,
        safetyAnalysis
      );

      const latencyMs = Date.now() - startTime;

      // Log the compliance check
      await logAgentCall({
        sessionId: this.sessionId,
        traceId: this.traceId,
        agentType: 'SUPERVISOR', // Request interceptor runs before supervisor
        modelId,
        callDirection: 'REQUEST',
        complianceStatus,
        violationType: safetyAnalysis.violations[0] || undefined,
        policyRuleId: policyRuleId || undefined,
        rawContent: userMessage,
        contentSummary,
        latencyMs,
        blocked: complianceStatus === 'VIOLATION',
      });

      // Return classification result with detailed analysis
      return {
        status: complianceStatus,
        shouldBlock: complianceStatus === 'VIOLATION',
        message: this.getBlockMessage(safetyAnalysis.violations),
        medicalContext,
        safetyAnalysis,
        riskLevel: safetyAnalysis.riskLevel,
        violations: safetyAnalysis.violations,
        detectedDrugs: safetyAnalysis.detectedDrugs,
      };
    } catch (error) {
      console.error('Request compliance check failed:', error);
      throw error;
    }
  }

  /**
   * Check response compliance before returning to user
   * Analyzes AI response for medical safety violations and ensures proper disclaimers
   */
  async checkResponseCompliance(
    agentResponse: string,
    agentType: 'SUPERVISOR' | 'SPECIALIST',
    modelId: string,
    specialistDomain?: string
  ) {
    const startTime = Date.now();

    try {
      // Parse the response to extract content type and recommendations
      const parsedResponse = RequestResponseParser.parseResponse(agentResponse);

      // Analyze for medical safety violations
      const safetyAnalysis = MedicalSafetyDetector.analyzeResponse(agentResponse);

      // Determine compliance status
      const complianceStatus = MedicalSafetyDetector.determineComplianceStatus(safetyAnalysis);
      const policyRuleId = MedicalSafetyDetector.getPolicyRuleId(safetyAnalysis.violations);

      // Generate content summary (non-PHI)
      const contentSummary = MedicalSafetyDetector.generateContentSummary(
        agentResponse,
        safetyAnalysis
      );

      // Check for missing disclaimers if response contains medical advice
      let finalComplianceStatus = complianceStatus;
      if (
        complianceStatus === 'COMPLIANT' &&
        parsedResponse.type !== 'redirectional' &&
        !parsedResponse.hasDisclaimers
      ) {
        finalComplianceStatus = 'NEEDS_REVIEW';
      }

      const latencyMs = Date.now() - startTime;

      // For specialist agents, use parentTraceId
      const logEntry: any = {
        sessionId: this.sessionId,
        traceId: this.traceId,
        agentType,
        specialistDomain: specialistDomain || undefined,
        modelId,
        callDirection: 'RESPONSE',
        complianceStatus: finalComplianceStatus,
        violationType: safetyAnalysis.violations[0] || undefined,
        policyRuleId: policyRuleId || undefined,
        rawContent: agentResponse,
        contentSummary,
        latencyMs,
        blocked: finalComplianceStatus === 'VIOLATION',
      };

      // Log the compliance check
      await logAgentCall(logEntry);

      return {
        status: finalComplianceStatus,
        shouldBlock: finalComplianceStatus === 'VIOLATION',
        message: this.getBlockMessage(safetyAnalysis.violations),
        responseType: parsedResponse.type,
        hasDisclaimers: parsedResponse.hasDisclaimers,
        riskLevel: safetyAnalysis.riskLevel,
        violations: safetyAnalysis.violations,
        detectedDrugs: safetyAnalysis.detectedDrugs,
        detectedDosages: safetyAnalysis.detectedDosages,
        recommendations: parsedResponse.recommendations,
      };
    } catch (error) {
      console.error('Response compliance check failed:', error);
      throw error;
    }
  }

  /**
   * Generate appropriate block message based on violation type
   */
  private getBlockMessage(violations: string[]): string {
    if (violations.length === 0) return '';

    const violation = violations[0];

    if (violation.includes('RULE_001') || violation.includes('RULE_004')) {
      return 'We\'re sorry, but we cannot process prescription requests. Please consult a licensed healthcare professional for prescriptions.';
    }

    if (violation.includes('RULE_002')) {
      return 'We\'re sorry, but this request falls outside the scope of what Doctor Assistant can help with. Please consult a licensed healthcare professional.';
    }

    if (violation.includes('RULE_003')) {
      return 'If you\'re experiencing a mental health crisis, please contact emergency services or a crisis helpline immediately.';
    }

    if (violation.includes('RULE_005')) {
      return 'Doctor Assistant cannot provide medical diagnoses or prescriptions. For medical advice, please consult a licensed healthcare provider.';
    }

    return 'We\'re sorry, but this request cannot be processed. Please consult a licensed healthcare professional for medical advice.';
  }

  /**
   * Get response fallback message when blocked
   */
  private getResponseFallback(): string {
    return 'Based on the symptoms you\'ve described, I can provide some general context, but I\'m unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need.';
  }

  /**
   * Create new trace for next user query (reset traceId only)
   */
  newQuery() {
    this.traceId = uuidv4();
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    return AuditLogger.getSessionStatistics(this.sessionId);
  }

  /**
   * Get session violations
   */
  async getSessionViolations() {
    return AuditLogger.getSessionViolations(this.sessionId);
  }

  // Getters for IDs
  getSessionId(): string {
    return this.sessionId;
  }

  getTraceId(): string {
    return this.traceId;
  }
}

/**
 * Usage in API Route
 * 
 * Example: app/api/getchat/route.ts
 * 
 * This demonstrates the full compliance and safety checking workflow
 */
export async function exampleChatRoute(request: Request) {
  const interceptor = new ComplianceInterceptor();
  const { message } = await request.json();

  // Step 1: Check request compliance (including medical safety detection)
  const requestCheck = await interceptor.checkRequestCompliance(
    message,
    'qwen/qwen3-32b'
  );

  console.log('Request Analysis:', {
    intent: requestCheck.medicalContext?.intent,
    symptoms: requestCheck.medicalContext?.symptoms,
    riskLevel: requestCheck.riskLevel,
    violations: requestCheck.violations,
    detectedDrugs: requestCheck.detectedDrugs,
  });

  if (requestCheck.shouldBlock) {
    return new Response(
      JSON.stringify({
        error: 'Request blocked for compliance',
        message: requestCheck.message,
        riskLevel: requestCheck.riskLevel,
        violations: requestCheck.violations,
      }),
      { status: 403 }
    );
  }

  // Step 2: Route to supervisor agent
  const result = await supervisorAgent.invoke({
    messages: [new HumanMessage(message)]
  });
  const messages = result.messages || [];
  const finalMessage = messages[messages.length - 1];
  const supervisorResponse = typeof finalMessage?.content === "string" ? finalMessage.content : JSON.stringify(finalMessage?.content);

  // Step 3: Check response compliance (including medical safety detection)
  const responseCheck = await interceptor.checkResponseCompliance(
    supervisorResponse,
    'SUPERVISOR',
    'qwen/qwen3-32b'
  );

  console.log('Response Analysis:', {
    responseType: responseCheck.responseType,
    hasDisclaimers: responseCheck.hasDisclaimers,
    riskLevel: responseCheck.riskLevel,
    violations: responseCheck.violations,
    detectedDosages: responseCheck.detectedDosages,
  });

  if (responseCheck.shouldBlock) {
    // Return fallback message instead
    return new Response(
      JSON.stringify({
        message: interceptor['getResponseFallback'](),
        blocked: true,
        reason: responseCheck.violations.join(', '),
      }),
      { status: 200 }
    );
  }

  // Optional: Flag for review if missing disclaimers
  if (responseCheck.status === 'NEEDS_REVIEW' && !responseCheck.hasDisclaimers) {
    console.warn('Response flagged for review - missing disclaimers');
  }

  // Step 4: Return compliant response
  return new Response(
    JSON.stringify({
      message: supervisorResponse,
      sessionId: interceptor.getSessionId(),
      traceId: interceptor.getTraceId(),
      analysis: {
        responseType: responseCheck.responseType,
        hasDisclaimers: responseCheck.hasDisclaimers,
        recommendations: responseCheck.recommendations,
      },
    }),
    { status: 200 }
  );
}

/**
 * Monitoring & Alerts with Medical Safety Analysis
 * 
 * Example: Cron job or scheduled task
 * Monitors medical safety violations and alerts on patterns
 */
export async function checkComplianceAlerts() {
  const lastHour = new Date(Date.now() - 3600000);
  const now = new Date();

  const stats = await AuditLogger.getViolationStatistics(lastHour, now);
  const violations = await AuditLogger.getViolationsByDateRange(lastHour, now, 50);

  const VIOLATION_THRESHOLD = 10;
  const PRESCRIPTION_THRESHOLD = 5;
  const CRITICAL_VIOLATION_THRESHOLD = 3;

  // Alert on high violation count
  if (stats.totalViolations > VIOLATION_THRESHOLD) {
    console.warn(`Alert: ${stats.totalViolations} violations in last hour`);
    // Send alert to monitoring system
  }

  // Alert on prescription detection attempts
  const prescriptionViolations = violations.filter((v: any) =>
    v.violationType?.includes('PRESCRIPTION') || v.policyRuleId?.includes('RULE_001')
  );

  if (prescriptionViolations.length > PRESCRIPTION_THRESHOLD) {
    console.warn(`Alert: ${prescriptionViolations.length} prescription request attempts in last hour`);
    // Send alert to monitoring system
  }

  // Alert on critical violations
  const criticalViolations = violations.filter(v =>
    ['RULE_002', 'RULE_003'].some(rule => v.policyRuleId?.includes(rule))
  );

  if (criticalViolations.length >= CRITICAL_VIOLATION_THRESHOLD) {
    console.error(`Critical Alert: ${criticalViolations.length} critical violations detected`);
    // Send urgent alert to monitoring system - potential security issue
  }

  // Pattern analysis
  const typeDistribution = stats.byViolationType || [];
  const topViolationType = typeDistribution.length > 0
    ? typeDistribution.reduce((a: any, b: any) => (b.count > a.count ? b : a))
    : null;

  if (topViolationType && topViolationType.count > 5) {
    console.warn(`Pattern Alert: ${topViolationType.type} accounts for ${topViolationType.count} violations`);
  }
}

/**
 * Compliance Report Generation with Medical Safety Insights
 * 
 * Example: Generate daily report
 */
export async function generateDailyComplianceReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = await AuditLogger.getViolationStatistics(today, tomorrow);
  const violations = await AuditLogger.getViolationsByDateRange(today, tomorrow, 100);

  // Categorize violations
  const prescriptionViolations = violations.filter(v =>
    v.policyRuleId?.includes('RULE_001') || v.violationType?.includes('PRESCRIPTION')
  );
  const controlledSubstanceViolations = violations.filter(v =>
    v.policyRuleId?.includes('RULE_002')
  );
  const dosageViolations = violations.filter(v =>
    v.policyRuleId?.includes('RULE_10')
  );

  return {
    date: today.toISOString().split('T')[0],
    summary: {
      totalViolations: stats.totalViolations,
      blocked: stats.blocked,
      complianceRate: ((stats.totalViolations / 100) * 100).toFixed(2) + '%',
    },
    byViolationType: stats.byViolationType,
    byAgentType: stats.byAgentType,
    medicalSafetyBreakdown: {
      prescriptionRequestAttempts: prescriptionViolations.length,
      controlledSubstanceRequests: controlledSubstanceViolations.length,
      dosageAdviceViolations: dosageViolations.length,
    },
    topViolations: violations.slice(0, 20).map((v: any) => ({
      id: v.id,
      sessionId: v.sessionId,
      violationType: v.violationType,
      policyRuleId: v.policyRuleId,
      blocked: v.blocked,
      createdAt: v.createdAt,
    })),
    recommendations: generateReportRecommendations(stats, violations),
  };
}

/**
 * Generate recommendations based on violation patterns
 */
function generateReportRecommendations(
  stats: any,
  violations: any[]
): string[] {
  const recommendations: string[] = [];

  if (stats.totalViolations > 50) {
    recommendations.push(
      'High violation rate detected. Review and strengthen compliance rules.'
    );
  }

  const prescriptionViolations = violations.filter(v =>
    v.policyRuleId?.includes('RULE_001')
  );
  if (prescriptionViolations.length > 10) {
    recommendations.push(
      'Significant number of prescription request attempts. Enhance user education on platform limitations.'
    );
  }

  const controlledSubstanceViolations = violations.filter(v =>
    v.policyRuleId?.includes('RULE_002')
  );
  if (controlledSubstanceViolations.length > 5) {
    recommendations.push(
      'Controlled substance requests detected. Consider escalation protocol review.'
    );
  }

  if (stats.blocked < stats.totalViolations * 0.7) {
    recommendations.push(
      'Block rate is lower than expected. Review NEEDS_REVIEW classification threshold.'
    );
  }

  return recommendations;
}

/**
 * Compliance Dashboard Data with Medical Safety Analytics
 * 
 * Example: Real-time dashboard endpoint
 */
export async function getDashboardData() {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [weekStats, todayStats] = await Promise.all([
    AuditLogger.getViolationStatistics(last7Days, now),
    AuditLogger.getViolationStatistics(last24Hours, now),
  ]);

  // Get recent violations for display
  const recentViolations = await AuditLogger.getViolationsByDateRange(
    last24Hours,
    now,
    10
  );

  // Categorize by medical safety concern
  const prescriptionAttempts = recentViolations.filter((v: any) =>
    v.policyRuleId?.includes('RULE_001')
  ).length;

  const controlledSubstanceRequests = recentViolations.filter((v: any) =>
    v.policyRuleId?.includes('RULE_002')
  ).length;

  const dosageViolations = recentViolations.filter((v: any) =>
    v.policyRuleId?.includes('RULE_003')
  ).length;

  /*
 * SETUP:
 * - [ ] Import MedicalSafetyDetector from './medicalSafetyDetector'
 * - [ ] Import RequestResponseParser from './requestResponseParser'
 * - [ ] Import AuditLogger from './auditLogger'
 * - [ ] Create ComplianceInterceptor instance in chat routes
 * 
 * REQUEST PIPELINE:
 * - [ ] Call checkRequestCompliance() before routing to supervisor
 * - [ ] Check medicalContext for user intent (prescription_request, symptom_inquiry, etc.)
 * - [ ] Review violations array for policy violations
 * - [ ] Block request if status === 'VIOLATION'
 * - [ ] Log analysis: intent, symptoms, detected drugs
 * 
 * RESPONSE PIPELINE:
 * - [ ] Call checkResponseCompliance() before returning to user
 * - [ ] Check responseType (prescription_like, diagnostic, redirectional, etc.)
 * - [ ] Verify hasDisclaimers for medical advice responses
 * - [ ] Replace response with fallback getResponseFallback() if blocked
 * - [ ] Log analysis: responseType, detected drugs, dosages, violations
 * 
 * MEDICAL SAFETY FEATURES:
 * - [ ] MedicalSafetyDetector detects prescription requests, controlled substances
 * - [ ] MedicalSafetyDetector detects definitive diagnoses without hedging
 * - [ ] MedicalSafetyDetector detects dosage advice
 * - [ ] RequestResponseParser extracts symptoms, conditions, medications
 * - [ ] Parser determines user intent (prescription, diagnosis, medication info, etc.)
 * 
 * SESSION MANAGEMENT:
 * - [ ] Keep session ID for entire user session
 * - [ ] Create new trace ID for each user query with newQuery()
 * - [ ] Use getSessionId() and getTraceId() for logging
 * 
 * MONITORING & ALERTING:
 * - [ ] Set up checkComplianceAlerts() via cron job (hourly)
 * - [ ] Monitor prescription request attempts (threshold: 5)
 * - [ ] Monitor controlled substance requests (threshold: 3)
 * - [ ] Monitor critical violations (RULE_002, RULE_003)
 * - [ ] Set up alerts for violation spikes
 * 
 * REPORTING:
 * - [ ] Generate daily reports via generateDailyComplianceReport()
 * - [ ] Include medical safety breakdown (prescriptions, dosage, controlled substances)
 * - [ ] Implement dashboard via getDashboardData()
 * - [ ] Track prescription attempt trends
 * 
 * TESTING:
 * - [ ] Test prescription request blocking (e.g., "prescribe me amoxicillin")
 * - [ ] Test controlled substance detection (e.g., "fentanyl")
 * - [ ] Test definitive diagnosis detection without hedging
 * - [ ] Test dosage advice blocking (e.g., "take 500mg twice daily")
 * - [ ] Test legitimate symptom inquiries pass through
 * - [ ] Test hedged medical advice with disclaimers
 * - [ ] Test medical context extraction (symptoms, conditions, medications)
 * - [ ] Verify audit logs capture all analysis data
 * 
 * MAINTENANCE:
 * - [ ] Review and update medication and symptom lists quarterly
 * - [ ] Monitor for false positives in compliance detection
 * - [ ] Adjust violation thresholds based on usage patterns
 * - [ ] Archive old audit logs (90-day retention)
 * - [ ] Update policy rules as platform evolves
  */

  return {
    overview: {
      totalViolations: todayStats.totalViolations,
      blocked: todayStats.blocked,
      blockRate: todayStats.totalViolations > 0
        ? ((todayStats.blocked / todayStats.totalViolations) * 100).toFixed(2) + '%'
        : '0%',
    },
    medicalSafetyMetrics: {
      prescriptionRequestAttempts24h: prescriptionAttempts,
      controlledSubstanceRequests24h: controlledSubstanceRequests,
      dosageViolations24h: dosageViolations,
      trend: prescriptionAttempts > 5 ? 'increasing' : 'stable',
    },
    recentIncidents: recentViolations.map((v: any) => ({
      id: v.id,
      type: v.violationType,
      severity: v.blocked ? 'critical' : 'warning',
      time: v.createdAt,
    })),
  };
}

/**
 * Integration Checklist
 * 
 * - [ ] Create ComplianceInterceptor instance in your chat/API route
 * - [ ] Call checkRequestCompliance() before routing to supervisor
 * - [ ] Block request if status === 'VIOLATION'
 * - [ ] Call checkResponseCompliance() before returning to user
 * - [ ] Replace response with fallback if blocked
 * - [ ] Create new trace ID for each user query with newQuery()
 * - [ ] Keep session ID for entire user session
 * - [ ] Set up monitoring alerts via checkComplianceAlerts()
 * - [ ] Generate daily reports via generateDailyComplianceReport()
 * - [ ] Display compliance stats in dashboard via getDashboardData()
 * - [ ] Test with example requests/responses in compliance test suite
 * - [ ] Monitor audit log growth and set up log rotation/archival
 */
