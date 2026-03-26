# Audit & Observability API Documentation

## Overview

The Doctor Assistant platform includes a comprehensive audit logging and observability system that tracks all agent invocations, compliance decisions, and violations. This documentation provides detailed guidance on how to use the audit APIs.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Core Concepts](#core-concepts)
3. [API Endpoints](#api-endpoints)
4. [Usage Examples](#usage-examples)
5. [Audit Logger Service](#audit-logger-service)
6. [Best Practices](#best-practices)

---

## Architecture

The observability system consists of:

```
User Request
    ↓
Request Compliance Interceptor (checks for policy violations)
    ↓
Supervisor & Specialist Agents (multi-agent pipeline)
    ↓
Response Compliance Interceptor (checks for policy violations)
    ↓
Async Audit Logger (writes to PostgreSQL)
    ↓
Audit API (query and retrieve logs)
```

All compliance checks and agent calls are logged with:

- SHA-256 hash of content (no raw PHI stored)
- Compliance status (COMPLIANT, VIOLATION, NEEDS_REVIEW)
- Policy rule matched (if violation)
- Latency metrics
- Agent and call type information

---

## Core Concepts

### Session ID

Unique identifier for a complete user session. Groups all interactions within a single session.

### Trace ID

Unique identifier linking a Supervisor Agent call with all Specialist Agent calls for a single user query.

### Parent Trace ID

Used for Specialist Agent calls to reference their parent Supervisor Agent's Trace ID.

### Compliance Status

- **COMPLIANT**: Request/response passes all policy checks
- **VIOLATION**: Request/response violates policy and was blocked
- **NEEDS_REVIEW**: Request/response is borderline and flagged for review

### Content Hash

SHA-256 hash of the raw request/response content. Allows for content validation without storing raw data.

---

## API Endpoints

### 1. Query All Logs

**Endpoint:** `GET /api/audit/logs`

**Description:** Retrieve audit logs with optional filters and pagination

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | No | Filter by session ID |
| agentType | string | No | Filter by SUPERVISOR or SPECIALIST |
| complianceStatus | string | No | Filter by COMPLIANT, VIOLATION, or NEEDS_REVIEW |
| violationType | string | No | Filter by specific violation type |
| from | ISO 8601 | No | Start of time range |
| to | ISO 8601 | No | End of time range |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Records per page, max 100 (default: 20) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "log-id-123",
      "sessionId": "session-456",
      "traceId": "trace-789",
      "agentType": "SUPERVISOR",
      "modelId": "qwen/qwen3-32b",
      "callDirection": "REQUEST",
      "complianceStatus": "COMPLIANT",
      "violationType": null,
      "policyRuleId": null,
      "contentHash": "abcd1234...",
      "latencyMs": 145,
      "blocked": false,
      "createdAt": "2026-03-26T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 2. Get Single Log

**Endpoint:** `GET /api/audit/logs/:id`

**Description:** Retrieve a specific audit log record by ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "log-id-123",
    "sessionId": "session-456",
    "...": "..."
  }
}
```

---

### 3. Get Session Logs

**Endpoint:** `GET /api/audit/sessions/:sessionId`

**Description:** Retrieve all logs for a specific user session

**Query Parameters:**
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| page | integer | No | 1 |
| limit | integer | No | 50 |

**Response:**

```json
{
  "success": true,
  "data": [
    { "id": "...", "sessionId": "session-456", ... },
    { "id": "...", "sessionId": "session-456", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "pages": 3
  }
}
```

---

### 4. Get Violations

**Endpoint:** `GET /api/audit/violations`

**Description:** Retrieve only violation and needs_review records

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | No | Filter by session |
| agentType | string | No | Filter by SUPERVISOR or SPECIALIST |
| violationType | string | No | Filter by violation type |
| from | ISO 8601 | No | Start of time range |
| to | ISO 8601 | No | End of time range |
| blockedOnly | boolean | No | Only return blocked violations (default: false) |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Records per page, max 100 (default: 20) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "log-id-456",
      "sessionId": "session-789",
      "complianceStatus": "VIOLATION",
      "violationType": "PRESCRIPTION_DETECTED",
      "policyRuleId": "RULE_101",
      "blocked": true,
      "createdAt": "2026-03-26T11:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  },
  "summary": {
    "totalViolations": 42,
    "blockedViolations": 35
  }
}
```

---

### 5. Get Statistics

**Endpoint:** `GET /api/audit/stats`

**Description:** Get compliance statistics and analytics dashboard data

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | No | Get stats for specific session |
| from | ISO 8601 | No | Start of time range |
| to | ISO 8601 | No | End of time range |

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalLogs": 1500,
      "compliant": 1380,
      "violations": 85,
      "needsReview": 35,
      "blocked": 60,
      "compliancePercentage": 92.0,
      "violationPercentage": 5.67,
      "blockRate": 4.0
    },
    "breakdown": {
      "byAgentType": [
        { "agentType": "SUPERVISOR", "count": 500 },
        { "agentType": "SPECIALIST", "count": 1000 }
      ],
      "byCallDirection": [
        { "callDirection": "REQUEST", "count": 750 },
        { "callDirection": "RESPONSE", "count": 750 }
      ],
      "byViolationType": [
        { "violationType": "PRESCRIPTION_DETECTED", "count": 45 },
        { "violationType": "ILLEGAL_REQUEST", "count": 30 },
        { "violationType": "DOSAGE_ADVICE", "count": 10 }
      ]
    },
    "performance": {
      "averageLatencyMs": 127.5
    },
    "recentViolations": [
      {
        "id": "log-123",
        "sessionId": "session-456",
        "createdAt": "2026-03-26T12:00:00Z",
        "agentType": "SPECIALIST",
        "complianceStatus": "VIOLATION",
        "violationType": "PRESCRIPTION_DETECTED",
        "policyRuleId": "RULE_101",
        "blocked": true
      }
    ]
  },
  "query": {
    "sessionId": null,
    "timeRange": {
      "from": null,
      "to": null
    }
  }
}
```

---

### 6. Create Audit Log (Internal)

**Endpoint:** `POST /api/audit/logs`

**Description:** Create a new audit log entry (called internally by middleware)

**Request Body:**

```json
{
  "sessionId": "session-123",
  "traceId": "trace-456",
  "parentTraceId": "trace-parent-789",
  "agentType": "SPECIALIST",
  "specialistDomain": "CARDIOLOGY",
  "modelId": "llama-3.1-8b-instant",
  "callDirection": "RESPONSE",
  "complianceStatus": "COMPLIANT",
  "violationType": null,
  "policyRuleId": null,
  "contentHash": "abcd1234efgh5678",
  "contentSummary": "Discussion of heart conditions",
  "latencyMs": 145,
  "blocked": false
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "new-log-id",
    "sessionId": "session-123",
    "...": "..."
  }
}
```

---

## Usage Examples

### Example 1: Check Compliance for Today

```bash
curl -X GET "http://localhost:3000/api/audit/stats?from=2026-03-26T00:00:00Z&to=2026-03-26T23:59:59Z"
```

**Use Case:** Daily compliance dashboard

---

### Example 2: Find All Blocked Prescription Violations

```bash
curl -X GET "http://localhost:3000/api/audit/violations?violationType=PRESCRIPTION_DETECTED&blockedOnly=true&limit=50"
```

**Use Case:** Compliance review - prescription detection

---

### Example 3: Get All Logs for a Specific User Session

```bash
curl -X GET "http://localhost:3000/api/audit/sessions/session-xyz-123?page=1&limit=100"
```

**Use Case:** Session history audit trail

---

### Example 4: Query Last 7 Days of Violations by Agent

```bash
curl -X GET "http://localhost:3000/api/audit/violations?from=2026-03-19T00:00:00Z&to=2026-03-26T23:59:59Z&agentType=SPECIALIST&page=1&limit=25"
```

**Use Case:** Weekly compliance report

---

### Example 5: Get Compliance Statistics for a Session

```bash
curl -X GET "http://localhost:3000/api/audit/stats?sessionId=session-xyz-123"
```

**Use Case:** Individual session compliance review

---

## Audit Logger Service

The `AuditLogger` class provides programmatic access to audit logging functionality.

### Location

`lib/compliance/auditLogger.ts`

### Methods

#### 1. logAgentCall(entry)

Log an agent call asynchronously (non-blocking)

```typescript
import { logAgentCall } from "@/lib/compliance/auditLogger";

await logAgentCall({
  sessionId: "session-123",
  traceId: "trace-456",
  agentType: "SUPERVISOR",
  modelId: "qwen/qwen3-32b",
  callDirection: "REQUEST",
  complianceStatus: "COMPLIANT",
  rawContent: userMessage,
  latencyMs: 120,
  blocked: false,
});
```

#### 2. AuditLogger.generateContentHash(content)

Generate SHA-256 hash of content

```typescript
import { AuditLogger } from "@/lib/compliance/auditLogger";

const hash = AuditLogger.generateContentHash(content);
```

#### 3. AuditLogger.getSessionLogs(sessionId, limit)

Get logs for a session

```typescript
const logs = await AuditLogger.getSessionLogs("session-123", 50);
```

#### 4. AuditLogger.getSessionViolations(sessionId, blockedOnly)

Get violations for a session

```typescript
const violations = await AuditLogger.getSessionViolations("session-123", true);
```

#### 5. AuditLogger.getSessionStatistics(sessionId)

Get compliance statistics for a session

```typescript
const stats = await AuditLogger.getSessionStatistics("session-123");
console.log(stats);
// Output:
// {
//   compliant: 125,
//   violations: 8,
//   needsReview: 3,
//   blocked: 5,
//   total: 136
// }
```

#### 6. AuditLogger.getViolationsByDateRange(from, to, limit)

Get violations within a date range

```typescript
const violations = await AuditLogger.getViolationsByDateRange(
  new Date("2026-03-19"),
  new Date("2026-03-26"),
  100,
);
```

#### 7. AuditLogger.getViolationStatistics(from, to)

Get violation statistics for a date range

```typescript
const stats = await AuditLogger.getViolationStatistics(
  new Date("2026-03-19"),
  new Date("2026-03-26"),
);
console.log(stats);
// Output:
// {
//   totalViolations: 42,
//   blocked: 35,
//   byViolationType: [
//     { type: 'PRESCRIPTION_DETECTED', count: 25 },
//     { type: 'ILLEGAL_REQUEST', count: 17 }
//   ],
//   byAgentType: [
//     { agentType: 'SUPERVISOR', count: 10 },
//     { agentType: 'SPECIALIST', count: 32 }
//   ]
// }
```

---

## Best Practices

### 1. Always Include Session ID

Every audit log should belong to a session for proper grouping:

```typescript
const sessionId = generateSessionId(); // Unique per user session
```

### 2. Use Consistent Trace IDs

Link supervisor and specialist calls with trace IDs:

```typescript
const traceId = generateTraceId(); // Unique per user query
// Supervisor Agent call uses this traceId
// All specialist calls use same traceId with parentTraceId pointing to supervisor
```

### 3. Hash Content, Don't Store Raw Data

Never store raw user messages or AI responses:

```typescript
// Good
contentHash: AuditLogger.generateContentHash(userMessage),
contentSummary: 'User asks about headache with fever',

// Bad
content: userMessage, // Never do this
```

### 4. Non-Blocking Logging

Use the async `logAgentCall()` for non-blocking writes:

```typescript
// Good - doesn't block user request
await logAgentCall(entry);

// Bad for user requests - blocks response
await prisma.agentAuditLog.create({ data: entry });
```

### 5. Regular Pruning

The audit log grows quickly. Implement retention policies:

```typescript
// Archive logs older than 90 days
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

// Move to archive table or delete based on policy
```

### 6. Monitoring Alerts

Set up alerts for violation spikes:

```typescript
// Check hourly violation rate
const stats = await AuditLogger.getViolationStatistics(
  new Date(Date.now() - 3600000),
  new Date(),
);

if (stats.totalViolations > THRESHOLD) {
  // Send alert
}
```

### 7. Compliance Reporting

Generate periodic compliance reports:

```bash
# Weekly compliance report
GET /api/audit/stats?from=2026-03-19T00:00:00Z&to=2026-03-26T23:59:59Z

# Monthly violation trend
GET /api/audit/violations?from=2026-02-26T00:00:00Z&to=2026-03-26T23:59:59Z
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description"
}
```

Common HTTP Status Codes:

- **200**: Success
- **201**: Resource created
- **400**: Bad request (missing/invalid parameters)
- **404**: Resource not found
- **500**: Server error

---

## Performance Considerations

- Compliance checks: Target < 200ms latency
- Audit log queries: Indexed on sessionId, traceId, complianceStatus, createdAt
- Pagination: Always use reasonable limits (max 100 records per page)
- Date ranges: Use narrow time ranges for better performance

---

## Integration Checklist

- [ ] Configure PostgreSQL connection in `.env`
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Set up API route files in `app/api/audit/`
- [ ] Import `AuditLogger` in compliance check middleware
- [ ] Call `logAgentCall()` after each agent invocation
- [ ] Configure audit log retention policy
- [ ] Set up monitoring alerts for violation spikes
- [ ] Test all observability endpoints
- [ ] Document log query patterns for your team
