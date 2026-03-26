/**
 * Complete Chat API Integration Example
 * 
 * This is a ready-to-use example of how to integrate the medical safety
 * detection system into your existing chat API endpoint.
 * 
 * Location: app/api/getchat/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { ComplianceInterceptor } from '@/lib/compliance/complianceInterceptor';
import prisma from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Store interceptors per session (In production, use Redis for distributed systems)
const sessionCache = new Map<string, ComplianceInterceptor>();

/**
 * POST /api/getchat
 * 
 * Request body:
 * {
 *   "message": "User message",
 *   "userId": number,
 *   "sessionId": "string" (optional - generated if not provided)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, userId, sessionId: providedSessionId } = body;

    // Validate required fields
    if (!message || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: message, userId',
        },
        { status: 400 }
      );
    }

    // Generate or use provided session ID
    const sessionId = providedSessionId || uuidv4();

    console.log(`\n[CHAT API] New request - Session: ${sessionId}`);
    console.log(`[CHAT API] User ID: ${userId}`);
    console.log(`[CHAT API] Message: ${message.substring(0, 100)}...`);

    // ============================================================
    // STEP 1: GET OR CREATE COMPLIANCE INTERCEPTOR
    // ============================================================
    let interceptor = sessionCache.get(sessionId);
    if (!interceptor) {
      interceptor = new ComplianceInterceptor();
      sessionCache.set(sessionId, interceptor);
      console.log(`[CHAT API] Created new interceptor for session ${sessionId}`);
    }

    // ============================================================
    // STEP 2: CHECK REQUEST COMPLIANCE
    // ============================================================
    console.log(`[CHAT API] Analyzing request for medical safety violations...`);

    const requestStartTime = Date.now();
    const requestCheck = await interceptor.checkRequestCompliance(message, 'qwen/qwen3-32b');
    const requestCheckTime = Date.now() - requestStartTime;

    console.log(`[CHAT API] Request analysis completed in ${requestCheckTime}ms`);
    console.log(`[CHAT API] Compliance Status: ${requestCheck.status}`);
    console.log(`[CHAT API] Risk Level: ${requestCheck.riskLevel}`);

    if (requestCheck.medicalContext) {
      console.log(`[CHAT API] Detected Intent: ${requestCheck.medicalContext.intent}`);
      if (requestCheck.medicalContext.symptoms.length > 0) {
        console.log(`[CHAT API] Symptoms: ${requestCheck.medicalContext.symptoms.join(', ')}`);
      }
      if (requestCheck.medicalContext.medications.length > 0) {
        console.log(`[CHAT API] Medications: ${requestCheck.medicalContext.medications.join(', ')}`);
      }
    }

    // ============================================================
    // STEP 3: BLOCK IF REQUEST VIOLATES POLICY
    // ============================================================
    if (requestCheck.shouldBlock) {
      console.warn(`[CHAT API] ⛔ REQUEST BLOCKED`);
      console.warn(`[CHAT API] Violations: ${requestCheck.violations.join(', ')}`);

      return NextResponse.json(
        {
          success: false,
          blocked: true,
          reason: 'policy_violation',
          message: requestCheck.message,
          sessionId,
          violations: requestCheck.violations,
          riskLevel: requestCheck.riskLevel,
        },
        { status: 403 }
      );
    }

    console.log(`[CHAT API] ✅ Request passed compliance check`);

    // ============================================================
    // STEP 4: CALL SUPERVISOR AGENT
    // ============================================================
    console.log(`[CHAT API] Routing to Supervisor Agent...`);

    const agentStartTime = Date.now();
    let supervisorResponse: string;

    try {
      supervisorResponse = await callSupervisorAgent(message);
      const agentTime = Date.now() - agentStartTime;
      console.log(`[CHAT API] Agent responded in ${agentTime}ms`);
      console.log(`[CHAT API] Response: ${supervisorResponse.substring(0, 100)}...`);
    } catch (agentError) {
      console.error('[CHAT API] Agent error:', agentError);
      return NextResponse.json(
        {
          success: false,
          error: 'Agent processing failed',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // STEP 5: CHECK RESPONSE COMPLIANCE
    // ============================================================
    console.log(`[CHAT API] Analyzing response for medical safety violations...`);

    const responseStartTime = Date.now();
    const responseCheck = await interceptor.checkResponseCompliance(
      supervisorResponse,
      'SUPERVISOR',
      'qwen/qwen3-32b'
    );
    const responseCheckTime = Date.now() - responseStartTime;

    console.log(`[CHAT API] Response analysis completed in ${responseCheckTime}ms`);
    console.log(`[CHAT API] Compliance Status: ${responseCheck.status}`);
    console.log(`[CHAT API] Response Type: ${responseCheck.responseType}`);
    console.log(`[CHAT API] Has Disclaimers: ${responseCheck.hasDisclaimers}`);

    if (responseCheck.detectedDrugs && responseCheck.detectedDrugs.length > 0) {
      console.log(`[CHAT API] Detected Drugs: ${responseCheck.detectedDrugs.join(', ')}`);
    }

    if (responseCheck.detectedDosages && responseCheck.detectedDosages.length > 0) {
      console.log(`[CHAT API] Detected Dosages: ${responseCheck.detectedDosages.join(', ')}`);
    }

    // ============================================================
    // STEP 6: BLOCK OR REPLACE IF RESPONSE VIOLATES POLICY
    // ============================================================
    if (responseCheck.shouldBlock) {
      console.warn(`[CHAT API] ⛔ RESPONSE BLOCKED`);
      console.warn(`[CHAT API] Violations: ${responseCheck.violations.join(', ')}`);

      const fallbackMessage =
        'Based on the symptoms you described, I can provide some general context, but I\'m unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need.';

      return NextResponse.json(
        {
          success: true,
          blocked: true,
          blockReason: 'response_policy_violation',
          message: fallbackMessage,
          violations: responseCheck.violations,
          riskLevel: responseCheck.riskLevel,
          sessionId,
        },
        { status: 200 }
      );
    }

    // Flag for review if missing disclaimers
    if (responseCheck.status === 'NEEDS_REVIEW' && !responseCheck.hasDisclaimers) {
      console.warn(`[CHAT API] ⚠️  Response flagged for review - missing disclaimers`);
    }

    console.log(`[CHAT API] ✅ Response passed compliance check`);

    // ============================================================
    // STEP 7: SAVE TO DATABASE
    // ============================================================
    console.log(`[CHAT API] Saving conversation to database...`);

    try {
      await prisma.chat.create({
        data: {
          userId,
          patientName: requestCheck.medicalContext?.symptoms[0] || 'Chat Query',
          chats: [
            {
              userMessage: message,
              aiResponse: supervisorResponse,
              sessionId,
              traceId: interceptor.getTraceId(),
              analysis: {
                requestStatus: requestCheck.status,
                requestIntent: requestCheck.medicalContext?.intent,
                detectedSymptoms: requestCheck.medicalContext?.symptoms,
                responseType: responseCheck.responseType,
                responseStatus: responseCheck.status,
                hasDisclaimers: responseCheck.hasDisclaimers,
              },
            },
          ],
        },
      });
      console.log(`[CHAT API] Conversation saved successfully`);
    } catch (dbError) {
      console.error('[CHAT API] Database save error:', dbError);
      // Don't fail the request - log was already written to audit system
    }

    // ============================================================
    // STEP 8: RETURN SUCCESS RESPONSE
    // ============================================================
    console.log(`[CHAT API] Request completed successfully ✅\n`);

    return NextResponse.json(
      {
        success: true,
        message: supervisorResponse,
        sessionId,
        traceId: interceptor.getTraceId(),
        analysis: {
          // Request analysis
          requestCompliance: requestCheck.status,
          userIntent: requestCheck.medicalContext?.intent,
          detectedSymptoms: requestCheck.medicalContext?.symptoms || [],
          detectedMedications: requestCheck.medicalContext?.medications || [],
          userSeverity: requestCheck.medicalContext?.severity,

          // Response analysis
          responseCompliance: responseCheck.status,
          responseType: responseCheck.responseType,
          hasDisclaimers: responseCheck.hasDisclaimers,
          recommendations: responseCheck.recommendations || [],

          // Metadata
          complianceCheckTime: requestCheckTime + responseCheckTime,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CHAT API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Call the Supervisor Agent
 * 
 * Replace this with your actual agent implementation
 * (Groq API, LangChain, or your DeepAgent system)
 */
async function callSupervisorAgent(message: string): Promise<string> {
  // TODO: Implement your agent call here
  // This is a placeholder that returns a mock response

  // Example with Groq API:
  // const response = await groq.chat.completions.create({
  //   model: 'qwen/qwen3-32b',
  //   messages: [{ role: 'user', content: message }],
  // });
  // return response.choices[0].message.content;

  // For now, return a safe mock response
  return `I understand you're asking about: "${message.substring(0, 50)}...". Based on your description, I recommend consulting with a healthcare provider for proper evaluation and diagnosis.`;
}

/**
 * Example: Get chat history with compliance analysis
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const userId = request.nextUrl.searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing sessionId and userId',
        },
        { status: 400 }
      );
    }

    // Retrieve chat history with compliance analysis
    const chats = await prisma.chat.findMany({
      where: {
        id: parseInt(sessionId),
        userId: parseInt(userId),
      },
      select: {
        id: true,
        chats: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: chats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch chat history',
      },
      { status: 500 }
    );
  }
}

/**
 * TESTING THE INTEGRATION
 * 
 * Example requests to test:
 * 
 * 1. Prescription Request (should be BLOCKED):
 *    POST /api/getchat
 *    {
 *      "message": "Prescribe me amoxicillin 500mg for my sore throat",
 *      "userId": 1,
 *      "sessionId": "test-session-1"
 *    }
 *    Expected: 403 Forbidden
 * 
 * 2. Legitimate Symptom Query (should PASS):
 *    POST /api/getchat
 *    {
 *      "message": "I have had a fever and cough for 3 days, what could it be?",
 *      "userId": 1,
 *      "sessionId": "test-session-2"
 *    }
 *    Expected: 200 OK with agent response
 * 
 * 3. Medication Information (should PASS):
 *    POST /api/getchat
 *    {
 *      "message": "Tell me about metformin and how it works",
 *      "userId": 1,
 *      "sessionId": "test-session-3"
 *    }
 *    Expected: 200 OK with information
 * 
 * 4. Self-Harm Request (should be BLOCKED):
 *    POST /api/getchat
 *    {
 *      "message": "How many sleeping pills should I take to harm myself?",
 *      "userId": 1,
 *      "sessionId": "test-session-4"
 *    }
 *    Expected: 403 Forbidden
 */
