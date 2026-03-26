# Medical Safety & Compliance Implementation Guide

## Overview

This guide provides a complete walkthrough for implementing the medical safety detection system integrated with audit logging and observability. The system automatically parses chatbot requests and responses to detect violations of medical safety guidelines.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Implementation Steps](#implementation-steps)
4. [Integration with Chat API](#integration-with-chat-api)
5. [Usage Examples](#usage-examples)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Alerting](#monitoring--alerting)

---

## Architecture Overview

```
User Request
    ↓
    ├─→ RequestResponseParser.parseRequest()
    │    └─→ Extract medical context (symptoms, medications, age, etc.)
    │
    ├─→ MedicalSafetyDetector.analyzeRequest()
    │    └─→ Check for violations (prescriptions, controlled substances, etc.)
    │
    ├─→ Log to audit system
    │
    └─→ Block/Continue based on compliance status
         ↓
    Agent Pipeline Decision
         ↓
Agent Response
    ↓
    ├─→ RequestResponseParser.parseResponse()
    │    └─→ Extract response type and recommendations
    │
    ├─→ MedicalSafetyDetector.analyzeResponse()
    │    └─→ Check for violations (dosage advice, firm diagnosis, etc.)
    │
    ├─→ Log to audit system
    │
    └─→ Block/Continue based on compliance status
         ↓
User Receives Response (or fallback)
```

---

## Core Components

### 1. MedicalSafetyDetector (`lib/compliance/medicalSafetyDetector.ts`)

**Purpose:** Analyzes requests and responses for medical safety violations

**Key Methods:**
- `analyzeRequest(request)` - Analyzes user input for violations
- `analyzeResponse(response)` - Analyzes AI response for violations
- `determineComplianceStatus(analysis)` - Returns COMPLIANT/VIOLATION/NEEDS_REVIEW
- `getPolicyRuleId(violations)` - Extracts policy rule ID
- `generateContentSummary(content, analysis)` - Creates non-PHI summary

**Detectable Violations:**

| Violation | Pattern | Status |
|-----------|---------|--------|
| RULE_001 | Prescription requests | VIOLATION |
| RULE_002 | Controlled substance requests | VIOLATION |
| RULE_003 | Self-harm requests | VIOLATION |
| RULE_004 | Prescription document requests | VIOLATION |
| RULE_005 | Professional impersonation | NEEDS_REVIEW |
| RULE_101 | Drug + dosage combination | VIOLATION |
| RULE_102 | Prescriptive clinical language | VIOLATION |
| RULE_103 | Firm diagnosis without hedging | NEEDS_REVIEW |
| RULE_104 | Dosage modification advice | VIOLATION |
| RULE_105 | Treatment-intent medicine recommendation | NEEDS_REVIEW |

### 2. RequestResponseParser (`lib/compliance/requestResponseParser.ts`)

**Purpose:** Parses and extracts medical information from text

**Key Methods:**
- `parseRequest(request)` - Returns MedicalContext with symptoms, conditions, intent
- `parseResponse(response)` - Returns ParsedResponse with type and recommendations
- `generateSummary(context)` - Creates non-PHI summary

**Extracted Information:**
- Symptoms (headache, fever, cough, etc.)
- Conditions (diabetes, hypertension, arthritis, etc.)
- Medications (amoxicillin, metformin, etc.)
- Allergies
- Demographics (age, gender)
- Duration (e.g., "3 days")
- Severity (mild, moderate, severe)
- User intent (symptom_inquiry, diagnosis_request, medication_info, prescription_request)

### 3. ComplianceInterceptor (`lib/compliance/complianceInterceptor.ts`)

**Purpose:** Orchestrates request/response checking with session management

**Key Methods:**
- `checkRequestCompliance(message, modelId)` - Full request validation
- `checkResponseCompliance(response, agentType, modelId)` - Full response validation
- `newQuery()` - Creates new trace ID for next query
- `getSessionId()` / `getTraceId()` - Session management

### 4. AuditLogger (`lib/compliance/auditLogger.ts`)

**Purpose:** Non-blocking asynchronous audit logging

**Key Methods:**
- `logAgentCall(entry)` - Fire-and-forget audit logging
- `AuditLogger.getSessionLogs()` - Retrieve session logs
- `AuditLogger.getViolationsByDateRange()` - Query violations
- `AuditLogger.getViolationStatistics()` - Compliance analytics

---

## Implementation Steps

### Step 1: Set Up Dependencies

```bash
npm install uuid
npm install @prisma/client
```

### Step 2: Create Interceptor Instance

```typescript
import { ComplianceInterceptor } from '@/lib/compliance/complianceInterceptor';

// Create once per user session
const interceptor = new ComplianceInterceptor();
```

### Step 3: Integrate into Chat Route

```typescript
// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ComplianceInterceptor } from '@/lib/compliance/complianceInterceptor';

export async function POST(request: NextRequest) {
  const { message, sessionId } = await request.json();

  // Get or create interceptor for session
  const interceptor = new ComplianceInterceptor();

  // Step 1: Request compliance check
  const requestCheck = await interceptor.checkRequestCompliance(
    message,
    'qwen/qwen3-32b'
  );

  if (requestCheck.shouldBlock) {
    return NextResponse.json(
      {
        error: 'Request cannot be processed',
        message: requestCheck.message,
      },
      { status: 403 }
    );
  }

  // Step 2: Call agent
  const agentResponse = await callSupervisorAgent(message);

  // Step 3: Response compliance check
  const responseCheck = await interceptor.checkResponseCompliance(
    agentResponse,
    'SUPERVISOR',
    'qwen/qwen3-32b'
  );

  if (responseCheck.shouldBlock) {
    return NextResponse.json(
      {
        message: 'I can provide general information, but for specific medical advice, please consult a healthcare provider.',
        blocked: true,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      message: agentResponse,
      analysis: {
        itemCount: requestCheck.medicalContext?.symptoms.length,
        responseSafetyStatus: responseCheck.status,
      },
    },
    { status: 200 }
  );
}
```

---

## Integration with Chat API

### Complete Chat API Example

```typescript
// app/api/getchat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ComplianceInterceptor } from '@/lib/compliance/complianceInterceptor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store interceptors per session (use Redis in production)
const sessionInterceptors = new Map<string, ComplianceInterceptor>();

export async function POST(request: NextRequest) {
  try {
    const { message, userId, sessionId } = await request.json();

    // Validate input
    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get or create interceptor for session
    let interceptor = sessionInterceptors.get(sessionId);
    if (!interceptor) {
      interceptor = new ComplianceInterceptor();
      sessionInterceptors.set(sessionId, interceptor);
    }

    // ==================== REQUEST COMPLIANCE CHECK ====================
    console.log(`[${sessionId}] Checking request compliance...`);

    const requestCheck = await interceptor.checkRequestCompliance(message, 'qwen/qwen3-32b');

    console.log(`[${sessionId}] Request Status: ${requestCheck.status}`);
    console.log(`[${sessionId}] Intent: ${requestCheck.medicalContext?.intent}`);
    console.log(`[${sessionId}] Symptoms: ${requestCheck.medicalContext?.symptoms.join(', ')}`);

    // Block if violation
    if (requestCheck.shouldBlock) {
      console.warn(`[${sessionId}] REQUEST BLOCKED: ${requestCheck.violations.join(', ')}`);

      return NextResponse.json(
        {
          success: false,
          blocked: true,
          message: requestCheck.message,
          sessionId,
          riskLevel: requestCheck.riskLevel,
        },
        { status: 403 }
      );
    }

    // ==================== CALL SUPERVISOR AGENT ====================
    console.log(`[${sessionId}] Routing to Supervisor Agent...`);

    const supervisorResponse = await callSupervisorAgent(message);

    // ==================== RESPONSE COMPLIANCE CHECK ====================
    console.log(`[${sessionId}] Checking response compliance...`);

    const responseCheck = await interceptor.checkResponseCompliance(
      supervisorResponse,
      'SUPERVISOR',
      'qwen/qwen3-32b'
    );

    console.log(`[${sessionId}] Response Status: ${responseCheck.status}`);
    console.log(`[${sessionId}] Response Type: ${responseCheck.responseType}`);
    console.log(`[${sessionId}] Has Disclaimers: ${responseCheck.hasDisclaimers}`);

    // Block if violation
    if (responseCheck.shouldBlock) {
      console.warn(`[${sessionId}] RESPONSE BLOCKED: ${responseCheck.violations.join(', ')}`);

      return NextResponse.json(
        {
          success: true,
          blocked: true,
          message: 'Based on your symptoms, I can provide general information, but for specific medical advice, please consult a healthcare provider.',
          sessionId,
        },
        { status: 200 }
      );
    }

    // ==================== SAVE TO DATABASE ====================
    await prisma.chat.create({
      data: {
        userId: parseInt(userId),
        patientName: requestCheck.medicalContext?.symptoms[0] || 'Query',
        chats: [
          {
            userMessage: message,
            aiResponse: supervisorResponse,
            analysis: {
              requestIntent: requestCheck.medicalContext?.intent,
              symptoms: requestCheck.medicalContext?.symptoms,
              responseType: responseCheck.responseType,
              complianceStatus: responseCheck.status,
            },
          },
        ],
      },
    });

    // ==================== RETURN RESPONSE ====================
    return NextResponse.json(
      {
        success: true,
        blocked: false,
        message: supervisorResponse,
        sessionId,
        traceId: interceptor.getTraceId(),
        analysis: {
          userIntent: requestCheck.medicalContext?.intent,
          symptomsDetected: requestCheck.medicalContext?.symptoms,
          responseType: responseCheck.responseType,
          hasDisclaimers: responseCheck.hasDisclaimers,
          recommendations: responseCheck.recommendations,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function - implement based on your agent setup
async function callSupervisorAgent(message: string): Promise<string> {
  // Call your Groq/LangChain agent here
  return 'Agent response here';
}
```

---

## Usage Examples

### Example 1: Prescription Request Detection

**Input:**
```
"Prescribe me amoxicillin 500mg for my throat infection"
```

**Analysis:**
```json
{
  "status": "VIOLATION",
  "riskLevel": "CRITICAL",
  "violations": ["RULE_001: Explicit prescription request"],
  "medicalContext": {
    "intent": "prescription_request",
    "symptoms": [],
    "medications": ["amoxicillin"],
    "detectedDosages": ["500mg"]
  },
  "shouldBlock": true,
  "message": "We cannot process prescription requests..."
}
```

### Example 2: Legitimate Symptom Inquiry

**Input:**
```
"I've had a fever and cough for 3 days. What might this be?"
```

**Analysis:**
```json
{
  "status": "COMPLIANT",
  "riskLevel": "SAFE",
  "violations": [],
  "medicalContext": {
    "intent": "symptom_inquiry",
    "symptoms": ["fever", "cough"],
    "severity": "unknown",
    "duration": "3 days"
  },
  "shouldBlock": false
}
```

### Example 3: Response with Dosage Violation

**AI Response:**
```
"For your bacterial infection, take 250mg of ciprofloxacin twice daily for 10 days"
```

**Analysis:**
```json
{
  "status": "VIOLATION",
  "riskLevel": "CRITICAL",
  "violations": ["RULE_101: Drug name + dosage present"],
  "detectedDrugs": ["ciprofloxacin"],
  "detectedDosages": ["250mg"],
  "shouldBlock": true
}
```

### Example 4: Compliant Medical Guidance

**AI Response:**
```
"Your symptoms may suggest a common cold or mild viral infection. Rest, fluids, and over-the-counter pain relievers might help. However, please consult a healthcare provider if symptoms persist or worsen."
```

**Analysis:**
```json
{
  "status": "COMPLIANT",
  "riskLevel": "SAFE",
  "violations": [],
  "responseType": "hedged_guidance",
  "hasDisclaimers": true,
  "shouldBlock": false
}
```

---

## Testing & Validation

### Run Test Suite

```typescript
import { MedicalSafetyTestSuite } from '@/lib/compliance/medicalSafetyTests';

// Run all tests
await MedicalSafetyTestSuite.runRequestTests();
await MedicalSafetyTestSuite.runResponseTests();
await MedicalSafetyTestSuite.runParsingTests();
await MedicalSafetyTestSuite.runFullIntegrationTest();
```

### Manual Testing

```bash
# Test prescription request blocking
curl -X POST http://localhost:3000/api/getchat \
  -H "Content-Type: application/json" \
  -d '{"message":"Prescribe me amoxicillin 500mg","userId":1,"sessionId":"test-123"}'

# Expected: 403 Forbidden with block message

# Test legitimate symptom inquiry
curl -X POST http://localhost:3000/api/getchat \
  -H "Content-Type: application/json" \
  -d '{"message":"I have fever and cough for 3 days","userId":1,"sessionId":"test-123"}'

# Expected: 200 OK with agent response and analysis
```

---

## Monitoring & Alerting

### Set Up Compliance Monitoring

```typescript
import { checkComplianceAlerts, getDashboardData } from '@/lib/compliance/complianceInterceptor';

// Check every hour
setInterval(async () => {
  await checkComplianceAlerts();
}, 60 * 60 * 1000);

// Get dashboard data
const dashboardData = await getDashboardData();
console.log('Today Violations:', dashboardData.today.violations);
console.log('Prescription Attempts:', dashboardData.medicalSafetyMetrics.prescriptionRequestAttempts24h);
```

### Query Audit Logs

```bash
# Get all violations in last 24 hours
curl http://localhost:3000/api/audit/violations?from=2026-03-26T00:00:00Z&to=2026-03-27T00:00:00Z

# Get violations for specific session
curl http://localhost:3000/api/audit/sessions/session-123

# Get compliance statistics
curl http://localhost:3000/api/audit/stats?from=2026-03-26T00:00:00Z&to=2026-03-27T00:00:00Z

# Generate daily report
async function getDailyReport() {
  const report = await generateDailyComplianceReport();
  console.log(report);
}
```

---

## Safety Checklis t

- ✅ All requests parsed for medical context before routing
- ✅ All requests checked for compliance violations
- ✅ Prescription requests blocked at request stage
- ✅ Controlled substance requests blocked
- ✅ Self-harm requests blocked and flagged for emergency
- ✅ All agent responses checked before displaying
- ✅ Responses with dosage advice blocked
- ✅ Responses with firm diagnoses flagged
- ✅ All checks logged to audit system with non-PHI content
- ✅ Session and trace IDs linked for full traceability
- ✅ Compliance violations trigger immediate blocking
- ✅ Monitoring alerts for violation spikes
- ✅ Daily compliance reports generated
- ✅ Dashboard shows real-time medical safety metrics

---

## Production Deployment Checklist

- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Audit log table created and indexed
- [ ] API rate limiting configured
- [ ] Monitoring alerts configured
- [ ] Session storage (Redis/database) configured
- [ ] Log rotation policy implemented (90-day retention)
- [ ] Team trained on compliance system
- [ ] Integration tests passing
- [ ] Monitoring dashboard deployed
- [ ] Incident response procedures documented
