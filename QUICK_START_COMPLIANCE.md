# Compliance & Safety System - Quick Start Guide

## 🎯 What You Get

A complete AI Compliance & Audit Logging System for the Doctor Assistant platform that:

- ✅ Detects 10+ medical safety violations in real-time
- ✅ Logs all compliance events with audit trail
- ✅ Provides beautiful dashboard to monitor violations
- ✅ Blocks dangerous requests/responses automatically
- ✅ Supports compliance officer workflows

## ⚡ 5-Minute Setup

### Step 1: Verify Files Exist

```bash
# These files should already be created in your project:

# Core compliance system
ls lib/compliance/
  - medicalSafetyDetector.ts
  - requestResponseParser.ts
  - complianceInterceptor.ts
  - auditLogger.ts
  - medicalSafetyTests.ts

# API endpoints
ls app/api/audit/
  - route.ts
  - [id]/route.ts
  - violations/route.ts
  - sessions/[sessionId]/route.ts
  - stats/route.ts

# Frontend pages
ls app/
  - compliance/page.tsx
  - violations/page.tsx

# Navigation
ls components/compliance/
  - ComplianceNavigation.tsx
  - ComplianceDashboard.tsx
  - ViolationsList.tsx
  - ComplianceStats.tsx
  - ViolationTrend.tsx
  - AuditLogViewer.tsx
  - ViolationDetailModal.tsx
```

### Step 2: Run Migrations

```bash
# Initialize database with audit logging table
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Step 3: Start Development Server

```bash
npm run dev
```

## 🌐 Access the Frontend

Open these URLs in your browser:

| URL                                | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `http://localhost:3000/compliance` | Compliance Dashboard with stats                       |
| `http://localhost:3000/violations` | Violations report with filtering                      |
| `http://localhost:3000/dashboard`  | Main dashboard (with compliance widget if integrated) |

## 📊 Test the System

### Test 1: Check If Violations Appear

```bash
# Navigate to http://localhost:3000/violations
# Should show compliance violation table

# If database is empty, run test cases:
# From medicalSafetyTests.ts, copy and run tests
```

### Test 2: Verify APIs

```bash
# Terminal: Check violations endpoint
curl http://localhost:3000/api/audit/violations

# Should return JSON like:
# {
#   "success": true,
#   "data": [...],
#   "summary": {
#     "totalViolations": 0,
#     "blockedViolations": 0
#   }
# }

# Check stats endpoint
curl http://localhost:3000/api/audit/stats

# Check audit logs
curl http://localhost:3000/api/audit?limit=5
```

### Test 3: Create a Test Violation

You can manually test by:

1. Using the medical safety detector:

```typescript
import { MedicalSafetyDetector } from "@/lib/compliance/medicalSafetyDetector";

const result = MedicalSafetyDetector.analyzeRequest(
  "Can you prescribe me fentanyl patches?",
);
// Should return: {status: 'VIOLATION', riskLevel: 'CRITICAL', violations: ['RULE_001', 'RULE_002']}
```

2. Or sending via API:

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you prescribe me oxycodone?",
    "sessionId": "test-123",
    "callDirection": "REQUEST",
    "agentType": "qwen/qwen3-32b"
  }'
```

## 🔗 Integration with Existing Chat

The critical piece is integrating compliance checking into your `/api/getchat` route.

### Quick Integration (Recommended)

**File:** `app/api/getchat/route.ts`

```typescript
import { ComplianceInterceptor } from "@/lib/compliance/complianceInterceptor";

export async function POST(req: Request) {
  const { message, sessionId, agentType } = await req.json();

  // NEW: Check request compliance
  const interceptor = new ComplianceInterceptor();
  const requestAnalysis = await interceptor.checkRequestCompliance(
    message,
    agentType || "qwen/qwen3-32b",
  );

  // If blocked, return error
  if (requestAnalysis.shouldBlock) {
    return new Response(
      JSON.stringify({
        error: "COMPLIANCE_VIOLATION",
        message: "This request violates medical safety guidelines.",
        violations: requestAnalysis.violations,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Your existing chat logic
  // const response = await yourChatHandlerHere(message);

  // NEW: Check response compliance
  // const responseAnalysis = await interceptor.checkResponseCompliance(
  //   response,
  //   agentType || 'qwen/qwen3-32b'
  // );
  //
  // if (responseAnalysis.shouldBlock) {
  //   return new Response(
  //     JSON.stringify({
  //       error: 'RESPONSE_VIOLATION',
  //       message: 'Generated response violates medical safety guidelines.',
  //     }),
  //     { status: 403 }
  //   );
  // }

  return new Response(JSON.stringify({ success: true /* response data */ }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

## 📋 Violation Rules

### Request Stage (5 rules)

| Rule     | Triggers On                                                    |
| -------- | -------------------------------------------------------------- |
| RULE_001 | User asks for prescription (e.g., "prescribe me", "can I get") |
| RULE_002 | Controlled substances (fentanyl, oxycodone, morphine, etc.)    |
| RULE_003 | Self-harm or suicidal language                                 |
| RULE_004 | Request for medical documents/prescriptions                    |
| RULE_005 | User claims to be medical professional                         |

### Response Stage (5 rules)

| Rule     | Triggers On                                                |
| -------- | ---------------------------------------------------------- |
| RULE_101 | Response includes drug name + dosage                       |
| RULE_102 | Prescriptive language ("take this", "use this medication") |
| RULE_103 | Firm diagnosis ("you have", "you likely have diabetes")    |
| RULE_104 | Dosage modification suggestions                            |
| RULE_105 | Treatment recommendations (specific to individual)         |

## 🛠️ Key Components

### Backend Files

```
lib/compliance/
├── medicalSafetyDetector.ts    # Violation detection (10 rules)
├── requestResponseParser.ts    # Parse medical context
├── complianceInterceptor.ts    # Orchestration layer
├── auditLogger.ts              # Enhanced logging
└── medicalSafetyTests.ts       # 20+ test cases

app/api/audit/
├── route.ts                    # GET/POST violations & logs
├── violations/route.ts         # Query violations
├── stats/route.ts              # Compliance statistics
├── [id]/route.ts               # Get single log
└── sessions/[sessionId]/route.ts # Session logs
```

### Frontend Files

```
app/
├── compliance/page.tsx         # Dashboard entry point
└── violations/page.tsx         # Violations report

components/compliance/
├── ComplianceNavigation.tsx    # Navigation component
├── ComplianceDashboard.tsx     # Main dashboard
├── ViolationsList.tsx          # Violations table
├── ComplianceStats.tsx         # Statistics cards
├── ViolationTrend.tsx          # Trend charts
├── AuditLogViewer.tsx          # Detailed logs
└── ViolationDetailModal.tsx    # Violation details modal
```

## 📱 Dashboard Features

### Compliance Dashboard (`/compliance`)

- Real-time compliance statistics
- Compliance percentage
- Total violations & blocked
- Breakdown by violation type
- Average latency metrics
- Recent critical violations

### Violations Report (`/violations`)

- Table with 20 violations per page
- Date range filtering (from/to)
- Block status filtering
- Severity color coding (red/yellow)
- Policy rule legend
- Expandable violation details

## 🧪 Run Test Cases

From `lib/compliance/medicalSafetyTests.ts`, you can run:

```typescript
// Test request detection
MedicalSafetyTestSuite.runRequestTests();

// Test response detection
MedicalSafetyTestSuite.runResponseTests();

// Test parsing
MedicalSafetyTestSuite.runParsingTests();

// Full integration test
MedicalSafetyTestSuite.runIntegrationTest();
```

Example test case:

```typescript
{
  input: "Can you prescribe me amoxicillin 500mg?",
  expectedStatus: "VIOLATION",
  expectedViolations: ["RULE_001"],
  expectedDetections: ["amoxicillin", "500mg"]
}
```

## 🔧 Configuration

### To Customize Violations

Edit `lib/compliance/medicalSafetyDetector.ts`:

```typescript
// Add to CONTROLLED_SUBSTANCES for new drugs
const CONTROLLED_SUBSTANCES = [
  "fentanyl",
  "oxycodone",
  "morphine",
  "YOUR_DRUG_HERE", // Add custom drug
];

// Modify regex patterns for new detection
const PRESCRIPTION_REQUEST_PATTERN = /prescribe|prescription|can.*i.*get/i;
```

### To Adjust Risk Levels

```typescript
// In medicalSafetyDetector.ts
// Change return risk levels:
return {
  status: "VIOLATION",
  riskLevel: "CRITICAL", // or 'WARNING'
  violations: ["RULE_001"],
};
```

## 📊 API Response Examples

### Get Violations

```bash
GET /api/audit/violations?limit=10&blockedOnly=false

{
  "success": true,
  "data": [
    {
      "id": "clp...",
      "sessionId": "sess-123",
      "complianceStatus": "VIOLATION",
      "riskLevel": "CRITICAL",
      "violations": ["RULE_001"],
      "detectedDrugs": ["amoxicillin"],
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalViolations": 15,
    "blockedViolations": 5
  }
}
```

### Get Compliance Stats

```bash
GET /api/audit/stats

{
  "success": true,
  "data": {
    "overview": {
      "totalLogs": 500,
      "compliantLogs": 450,
      "violations": 50,
      "blocked": 5,
      "compliancePercentage": 90.0
    },
    "breakdown": {
      "byViolationType": {
        "RULE_001": 15,
        "RULE_101": 20,
        ...
      }
    }
  }
}
```

## 🚨 Troubleshooting

### Problem: "Violations page is empty"

**Solution**:

1. Check if database migration ran: `npx prisma db push`
2. Run test cases to create sample violations
3. Check `/api/audit/violations` returns data

### Problem: "API returns 500 error"

**Solution**:

1. Verify Prisma client generated: `npx prisma generate`
2. Check DATABASE_URL is set correctly
3. Run: `npx prisma db push`

### Problem: "Compliance status badge not updating"

**Solution**:

1. Verify `/api/audit/violations` responds: `curl http://localhost:3000/api/audit/violations`
2. Check browser console for fetch errors
3. Verify timestamp format is correct

### Problem: "Components not found"

**Solution**:

1. Verify all files in `components/compliance/` exist
2. Check import paths use `@/components` alias
3. Run: `npm install` to ensure all dependencies

## 📚 Documentation Files

Read in this order:

1. **QUICK_REFERENCE.md** - Overview of features
2. **COMPLIANCE_INTEGRATION_GUIDE.md** - Full integration steps
3. **MEDICAL_SAFETY_IMPLEMENTATION_GUIDE.md** - Technical deep dive
4. **AUDIT_OBSERVABILITY_GUIDE.md** - API endpoint reference
5. **FRONTEND_ACCESS_GUIDE.md** - Frontend components reference

## ✅ Verification Checklist

- [ ] All files created (check `lib/compliance/` and `app/api/audit/`)
- [ ] Database migration ran (`npx prisma db push`)
- [ ] Dev server running (`npm run dev`)
- [ ] Can access `/compliance` page
- [ ] Can access `/violations` page
- [ ] API endpoints respond (check with curl)
- [ ] Compliance status badge visible
- [ ] Test violations appear in database

## 🎓 Next Steps

### Immediate (Next 5 minutes)

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/violations`
3. View compliance dashboard at `http://localhost:3000/compliance`

### Short Term (Next hour)

1. Integrate compliance checker into `/api/getchat`
2. Test with sample violations
3. Verify blocking works correctly

### Medium Term (Next day)

1. Customize violation rules per organization
2. Set up alerts for critical violations
3. Configure compliance officer permissions
4. Add export/reporting features

## 📞 Support

For specific issues:

- Check `MEDICAL_SAFETY_TESTS.ts` for 20+ example cases
- Review `AUDIT_OBSERVABILITY_GUIDE.md` for API details
- Look at `SIDEBAR_INTEGRATION_EXAMPLE.tsx` for UI integration

---

**Status**: ✅ All files created and ready to use!
**Next Action**: Start dev server and navigate to `/violations`
