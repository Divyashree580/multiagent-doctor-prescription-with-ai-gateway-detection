# Compliance & Safety System - Integration Guide

## Overview
This guide explains how to integrate the new Compliance & Safety monitoring system into your existing Doctor Assistant application.

## Quick Start (5 minutes)

### 1. Access Compliance Pages
- **Compliance Dashboard**: `http://localhost:3000/compliance`
- **Violations Report**: `http://localhost:3000/violations`

### 2. Verify API Endpoints
All endpoints are ready at `/api/audit`:
```bash
# Get violations
curl http://localhost:3000/api/audit/violations

# Get compliance stats
curl http://localhost:3000/api/audit/stats

# Get audit logs
curl http://localhost:3000/api/audit?limit=20
```

## Integration Steps

### Step 1: Add Navigation to Layout (Optional but Recommended)

**File**: `app/layout.tsx`

```typescript
import { ComplianceStatusBadge, ComplianceNavigation } from '@/components/compliance/ComplianceNavigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Doctor Assistant</h1>
            
            {/* Add compliance status badge to header */}
            <ComplianceStatusBadge />
          </div>
        </header>

        <div className="flex">
          {/* Sidebar with navigation */}
          <aside className="w-64 border-r p-4 bg-gray-50">
            <h2 className="text-lg font-semibold mb-4">Navigation</h2>
            <ComplianceNavigation />
          </aside>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

### Step 2: Integrate Medical Safety Detection into Chat API

**File**: `app/api/getchat/route.ts`

This is the CRITICAL integration point. Add compliance checking:

```typescript
import { ComplianceInterceptor } from '@/lib/compliance/complianceInterceptor';

export async function POST(req: Request) {
  const { message, sessionId, agentType } = await req.json();

  // CRITICAL: Check request compliance
  const interceptor = new ComplianceInterceptor();
  const requestAnalysis = await interceptor.checkRequestCompliance(
    message,
    agentType || 'qwen/qwen3-32b'
  );

  // If blocked, return compliance violation
  if (requestAnalysis.shouldBlock) {
    return new Response(
      JSON.stringify({
        error: 'COMPLIANCE_VIOLATION',
        message: 'This request violates medical safety guidelines.',
        violations: requestAnalysis.violations,
        details: requestAnalysis.detailedViolations,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Your existing chat logic here
  // const response = await yourChatLogic(message, sessionId, agentType);

  // CRITICAL: Check response compliance
  // const responseAnalysis = await interceptor.checkResponseCompliance(
  //   response,
  //   agentType || 'qwen/qwen3-32b'
  // );

  // if (responseAnalysis.shouldBlock) {
  //   return new Response(
  //     JSON.stringify({
  //       error: 'RESPONSE_VIOLATION',
  //       message: 'Generated response violates medical safety guidelines.',
  //       violations: responseAnalysis.violations,
  //     }),
  //     { status: 403, headers: { 'Content-Type': 'application/json' } }
  //   );
  // }

  // Return safe response
  return new Response(
    JSON.stringify({
      success: true,
      // response: response,
      // compliance: requestAnalysis, // Include compliance info
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Step 3: Add Compliance Monitoring to Dashboard

**File**: `app/dashboard/page.tsx`

```typescript
'use client';

import { ComplianceStatsWidget } from '@/components/compliance/ComplianceNavigation';
import { ComplianceQuickLinks } from '@/components/compliance/ComplianceNavigation';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Medical Dashboard</h1>

      {/* Add compliance widget */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
        <h2 className="font-semibold text-gray-900 mb-4">Compliance Status</h2>
        <ComplianceStatsWidget />
      </div>

      {/* Your existing dashboard content */}
      <div className="grid grid-cols-2 gap-4">
        {/* ... existing content ... */}
      </div>

      {/* Quick links to compliance pages */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Compliance & Safety</h2>
        <ComplianceQuickLinks />
      </div>
    </div>
  );
}
```

## Complete API Reference

### 1. Get Violations
```
GET /api/audit/violations?limit=50&blockedOnly=false&violationType=RULE_001
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sessionId": "session-id",
      "complianceStatus": "VIOLATION",
      "riskLevel": "CRITICAL",
      "violations": ["RULE_001"],
      "detectedDrugs": ["amoxicillin"],
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalViolations": 25,
    "blockedViolations": 10
  }
}
```

### 2. Get Compliance Stats
```
GET /api/audit/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalLogs": 1500,
      "compliantLogs": 1350,
      "violations": 150,
      "blocked": 10,
      "compliancePercentage": 90.0
    },
    "breakdown": {
      "byViolationType": { "RULE_001": 45, "RULE_101": 50, ... },
      "byAgentType": { "qwen/qwen3-32b": 80, ... },
      "byDirection": { "REQUEST": 75, "RESPONSE": 75 }
    },
    "performance": {
      "averageLatencyMs": 120
    }
  }
}
```

### 3. Get Audit Logs
```
GET /api/audit?sessionId=xxx&limit=50&skip=0
```

### 4. Get Session Logs
```
GET /api/audit/sessions/[sessionId]
```

### 5. Create/Log Entry (Internal Use)
```
POST /api/audit
```

## Violation Rules Reference

### Request-Stage Violations
| Rule ID | Name | Risk | Trigger |
|---------|------|------|---------|
| RULE_001 | Prescription Request | CRITICAL | User asks for prescription |
| RULE_002 | Controlled Substance | CRITICAL | User mentions controlled drugs (fentanyl, oxycodone, etc.) |
| RULE_003 | Self-Harm | CRITICAL | Self-harm or suicidal intent |
| RULE_004 | Prescription Documents | CRITICAL | Request for prescription/medical documents |
| RULE_005 | Professional Impersonation | CRITICAL | User claims to be medical professional |

### Response-Stage Violations
| Rule ID | Name | Risk | Trigger |
|---------|------|------|---------|
| RULE_101 | Drug + Dosage | CRITICAL | Response prescribes drug with dosage |
| RULE_102 | Prescriptive Language | WARNING | Response uses imperative drug language |
| RULE_103 | Firm Diagnosis | WARNING | Response makes definitive diagnosis |
| RULE_104 | Dosage Modification | WARNING | Response suggests dosage changes |
| RULE_105 | Treatment Recommendations | WARNING | Response recommends specific treatments |

## Testing

### 1. Test Medical Safety Detection
```bash
# Run test suite
npm run dev  # In one terminal

# In another terminal, test:
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"message":"Can you prescribe me amoxicillin 500mg?", "sessionId":"test-123"}'
```

### 2. View Violations
Navigate to: `http://localhost:3000/violations`

**Features:**
- Date range filtering (from/to dates)
- Block status filtering
- 20 violations per page
- Severity color-coding
- Policy rule legend

### 3. Monitor Compliance
Navigate to: `http://localhost:3000/compliance`

**Shows:**
- Real-time compliance statistics
- Violation trends
- Compliance breakdown by rule
- Recent critical violations

## Database Schema

The system uses a new `AgentAuditLog` model in Prisma:

```prisma
model AgentAuditLog {
  id              String   @id @default(cuid())
  sessionId       String   // Links to chat session
  traceId         String   // For request tracing
  agentType       String   // Which agent checked this
  callDirection   String   // REQUEST or RESPONSE
  complianceStatus String  // COMPLIANT, VIOLATION, NEEDS_REVIEW
  riskLevel       String   // SAFE, WARNING, CRITICAL
  violations      String[] // Array of violated rules
  detectedDrugs   String[] // Extracted medications
  detectedSymptoms String[] // Extracted symptoms
  inputHash       String   // SHA-256 of content (no PHI stored)
  summary         String   // Brief description
  timestamp       DateTime @default(now())
  
  @@index([sessionId])
  @@index([timestamp])
  @@index([complianceStatus])
}
```

## Environment Setup

### Required Environment Variables
```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/doctor_assistant"

# Prisma migration
npx prisma migrate deploy
npx prisma generate
```

### Run Migrations
```bash
cd prisma
npx prisma migrate dev --name add_audit_logging
```

## Common Issues & Solutions

### Issue: Violations not appearing in database
**Solution**: Ensure migrations ran:
```bash
npx prisma migrate deploy
npx prisma db push
```

### Issue: API returns 500 error
**Solution**: Check logs:
```bash
# Check Prisma connection
npx prisma db execute --stdin
```

### Issue: Compliance status badge shows "Loading..."
**Solution**: Verify `/api/audit/violations` endpoint responds:
```bash
curl http://localhost:3000/api/audit/violations
```

## Next Steps

1. ✅ **Integrated**: All compliance APIs are working
2. ✅ **Frontend**: Violations & compliance pages ready
3. ⏳ **Integration**: Add `ComplianceInterceptor` to `/api/getchat` route
4. ⏳ **Customization**: Adjust violation rules in `medicalSafetyDetector.ts` if needed
5. ⏳ **Monitoring**: Set up real-time dashboard refresh (WebSocket optional)

## Support

For detailed information:
- Medical Safety Implementation: See `MEDICAL_SAFETY_IMPLEMENTATION_GUIDE.md`
- API Documentation: See `AUDIT_OBSERVABILITY_GUIDE.md`
- Test Cases: See `lib/compliance/medicalSafetyTests.ts`

