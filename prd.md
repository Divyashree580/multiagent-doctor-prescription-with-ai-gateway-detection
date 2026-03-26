# PRD: AI Compliance & Audit Logging System
**Doctor Assistant Platform**

---

## Document Information

| Field | Value |
|---|---|
| **Document Title** | AI Compliance & Audit Logging System |
| **Feature Area** | Platform Safety & Regulatory Compliance |
| **Status** | Draft |
| **Version** | 1.0 |
| **Prepared For** | Doctor Assistant Engineering Team |

---

## 1. Executive Summary

The Doctor Assistant platform currently operates a Multi-Agent AI system that routes patient symptom queries to specialized medical sub-agents. As the platform scales, there is a growing need to enforce clear boundaries between permissible AI behavior (symptom analysis and health guidance) and prohibited behavior (prescribing medicines or facilitating illegal medical activity).

This PRD defines the requirements for an **AI Compliance & Audit Logging System** that intercepts all requests and responses across the multi-agent pipeline, detects policy violations in real time, and produces tamper-evident, structured audit logs for every agent invocation. The system must operate as a transparent middleware layer with zero impact on perceived response quality for compliant interactions.

---

## 2. Problem Statement

### 2.1 Current Gaps

The platform currently has no mechanism to:

- **Detect illegal or out-of-scope user requests** before they reach the agent pipeline (e.g., requests to prescribe controlled substances, forge prescriptions, or seek advice for self-harm).
- **Detect non-compliant AI responses** that include specific drug prescriptions, dosage instructions presented as medical orders, or any content that positions the AI as a licensed practitioner.
- **Log multi-agent calls** in a structured, queryable format for post-hoc audit, debugging, and regulatory review.
- **Enforce a hard guardrail** distinguishing symptom analysis (permitted) from medicine prescription (prohibited).

### 2.2 Risk Without This Feature

| Risk | Impact |
|---|---|
| AI prescribes a specific drug and dosage | Legal liability, patient harm, regulatory action |
| User submits a request to obtain controlled substances | Platform misuse, potential facilitation of illegal activity |
| No audit trail for agent calls | Inability to investigate incidents or demonstrate compliance |
| Compliance violations undetected | Reputational damage, loss of user trust |

---

## 3. Goals & Non-Goals

### 3.1 Goals

- Intercept and classify every inbound user request before agent routing.
- Intercept and classify every outbound agent response before it is displayed.
- Block and surface a safe fallback message for any request or response classified as non-compliant.
- Log every multi-agent invocation (Supervisor + Specialist calls) with structured metadata.
- Provide a queryable audit log API for internal review and compliance reporting.
- Operate with latency overhead under 200ms per request/response pair on average.

### 3.2 Non-Goals

- Replacing the existing medical disclaimer UI.
- Building a real-time clinician review dashboard (deferred to a future phase).
- Modifying the underlying Groq / LangChain agent logic.
- Implementing full HIPAA-compliant PHI storage (a separate compliance workstream).

---

## 4. User Stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-01 | Platform operator | All requests that ask for medicine prescriptions to be blocked | The platform is never used to circumvent licensed medical practice |
| US-02 | Platform operator | All AI responses that contain prescription-like content to be blocked | Users receive safe, scope-limited information only |
| US-03 | Compliance auditor | A structured, timestamped log of every agent call | I can investigate any incident end-to-end |
| US-04 | Backend engineer | Compliance checks to run as middleware | Core agent logic does not need to be modified |
| US-05 | Platform operator | A clear fallback message shown to users when content is blocked | Users are not left with a blank screen or cryptic error |
| US-06 | Data analyst | Logs to be queryable by session, agent type, violation type, and timestamp | I can produce compliance reports efficiently |

---

## 5. Feature Requirements

### 5.1 Request Compliance Interceptor

**Description:** A middleware layer that evaluates every inbound user message before it is forwarded to the Supervisor Agent.

**Functional Requirements:**

- **FR-REQ-01:** The interceptor MUST classify each request into one of three categories: `COMPLIANT`, `VIOLATION`, or `NEEDS_REVIEW`.
- **FR-REQ-02:** The interceptor MUST detect and flag requests that contain any of the following signals:
  - Explicit request for a named drug with dosage (e.g., "prescribe me 500mg of amoxicillin").
  - Request for a prescription document or letter.
  - Request involving controlled or scheduled substances by name.
  - Request involving self-harm, harm to others, or illegal acquisition of medication.
  - Attempts to impersonate a licensed medical professional through the AI.
- **FR-REQ-03:** Requests classified as `VIOLATION` MUST be blocked. The agent pipeline MUST NOT be invoked.
- **FR-REQ-04:** Requests classified as `NEEDS_REVIEW` MUST be forwarded to the agent pipeline with a compliance flag set, so the response interceptor applies heightened scrutiny.
- **FR-REQ-05:** The interceptor MUST log its classification decision, confidence signal, and matched policy rule ID for every request, regardless of outcome.
- **FR-REQ-06:** Detection logic MUST use an LLM-based classification call (see Section 7 for prompt specification) and MAY be supplemented by keyword/regex pre-filters for latency optimization.

**Violation Response (shown to user):**

```
We're sorry, but this request falls outside the scope of what Doctor Assistant 
can help with. This platform provides symptom analysis and general health 
information only. For medical prescriptions or treatment, please consult a 
licensed healthcare professional.
```

---

### 5.2 Response Compliance Interceptor

**Description:** A middleware layer that evaluates every outbound AI response before it is streamed or returned to the user.

**Functional Requirements:**

- **FR-RES-01:** The interceptor MUST classify each response into `COMPLIANT`, `VIOLATION`, or `NEEDS_REVIEW`.
- **FR-RES-02:** The interceptor MUST detect and flag responses that contain:
  - A specific drug name paired with a dosage amount (e.g., "take 250mg of metformin twice daily").
  - Language that implies a clinical prescription or medical order (e.g., "I am prescribing you…", "you should take…" combined with a drug name).
  - Diagnostic conclusions stated as definitive fact without appropriate hedging (e.g., "You have Type 2 Diabetes" vs. "Your symptoms may be consistent with…").
  - Any content advising on dosage modification for existing medications.
  - Content that recommends purchasing specific over-the-counter medicines as treatment (not merely information).
- **FR-RES-03:** Responses classified as `VIOLATION` MUST be blocked and replaced with a safe fallback message. The blocked content MUST NOT be shown to the user.
- **FR-RES-04:** The interceptor MUST log the classification, the rule matched, the agent that generated the response, and a truncated (non-PHI) version of the flagged content.
- **FR-RES-05:** The interceptor MUST preserve fully compliant responses without alteration or added latency beyond the classification call.

**Fallback Response (shown to user when response is blocked):**

```
Based on the symptoms you've described, I can provide some general context, 
but I'm unable to suggest specific medications or dosages. Please consult a 
licensed healthcare provider for personalized medical advice and any 
prescriptions you may need.
```

---

### 5.3 Multi-Agent Call Audit Logger

**Description:** A structured logging system that captures metadata for every invocation within the multi-agent pipeline — Supervisor Agent calls, Specialist Agent calls, and compliance interceptor decisions.

**Functional Requirements:**

- **FR-LOG-01:** A log record MUST be created for every Supervisor Agent call.
- **FR-LOG-02:** A log record MUST be created for every Specialist Agent call, linked to its parent Supervisor call via a shared `session_id` and `trace_id`.
- **FR-LOG-03:** A log record MUST be created for every compliance interceptor evaluation (both request and response).
- **FR-LOG-04:** Log records MUST be written to PostgreSQL (via Prisma ORM) using the schema defined in Section 6.
- **FR-LOG-05:** Logs MUST NOT store the raw user message or raw AI response to avoid unintended PHI capture. Logs MUST store a SHA-256 hash of the content and a short, non-identifying summary generated by the compliance classifier.
- **FR-LOG-06:** Logs MUST be immutable after creation. No update or delete operations shall be exposed on log records.
- **FR-LOG-07:** The logging layer MUST be asynchronous and MUST NOT block the request/response pipeline.
- **FR-LOG-08:** An internal REST API endpoint MUST be provided for querying logs by `session_id`, `agent_type`, `violation_type`, `timestamp_range`, and `compliance_status`.

---

## 6. Data Schema

### 6.1 `agent_audit_log` Table

```prisma
model AgentAuditLog {
  id               String    @id @default(cuid())
  sessionId        String    // Groups all calls within a single user session
  traceId          String    // Groups Supervisor + all Specialist calls for one user query
  parentTraceId    String?   // Set on Specialist calls; references Supervisor's traceId
  agentType        AgentType // SUPERVISOR | SPECIALIST
  specialistDomain String?   // e.g., "CARDIOLOGY", "DERMATOLOGY" (null for Supervisor)
  modelId          String    // e.g., "qwen/qwen3-32b", "llama-3.1-8b-instant"
  callDirection    CallDirection // REQUEST | RESPONSE
  complianceStatus ComplianceStatus // COMPLIANT | VIOLATION | NEEDS_REVIEW
  violationType    String?   // e.g., "PRESCRIPTION_DETECTED", "ILLEGAL_REQUEST"
  policyRuleId     String?   // The specific rule that triggered the flag
  contentHash      String    // SHA-256 of the raw content
  contentSummary   String?   // Short non-identifying summary from compliance classifier
  latencyMs        Int       // Time taken for compliance check in milliseconds
  blocked          Boolean   @default(false)
  createdAt        DateTime  @default(now())

  @@index([sessionId])
  @@index([traceId])
  @@index([complianceStatus])
  @@index([createdAt])
}

enum AgentType {
  SUPERVISOR
  SPECIALIST
}

enum CallDirection {
  REQUEST
  RESPONSE
}

enum ComplianceStatus {
  COMPLIANT
  VIOLATION
  NEEDS_REVIEW
}
```

---

## 7. Compliance Classifier — Prompt Specification

The LLM-based compliance classifier is a dedicated, lightweight call made before and after every agent invocation. It MUST use a separate, low-temperature call isolated from the agent chain.

### 7.1 Request Classification Prompt

```
You are a compliance classifier for a medical AI platform. Your only job is to 
determine whether a user request is within policy.

POLICY: The platform may only provide symptom analysis, general health education, 
and triage guidance. It MUST NOT respond to requests that ask for:
- Specific drug prescriptions or dosage recommendations
- Prescription documents or letters
- Controlled or scheduled substances by name with intent to obtain
- Advice facilitating self-harm or harm to others
- Impersonation of a licensed medical professional

USER REQUEST:
"""
{user_message}
"""

Respond ONLY with a JSON object in this exact format:
{
  "status": "COMPLIANT" | "VIOLATION" | "NEEDS_REVIEW",
  "policy_rule_id": "<rule_id or null>",
  "reason": "<one sentence explanation>"
}

Policy Rule IDs:
- RULE_001: Explicit prescription request
- RULE_002: Controlled substance acquisition
- RULE_003: Self-harm or harm to others
- RULE_004: Prescription document request
- RULE_005: Professional impersonation attempt
```

### 7.2 Response Classification Prompt

```
You are a compliance classifier for a medical AI platform. Your only job is to 
determine whether an AI-generated response is within policy.

POLICY: Responses may describe symptoms, explain conditions in general terms, and 
suggest consulting a doctor. Responses MUST NOT:
- Name a specific drug with a dosage (e.g., "take 500mg of X")
- Use prescriptive clinical language ("I prescribe", "you must take")
- State a diagnosis as definitive fact without hedging
- Recommend dosage adjustments for existing medications
- Recommend specific medicines as treatment (not merely information)

AI RESPONSE:
"""
{agent_response}
"""

Respond ONLY with a JSON object in this exact format:
{
  "status": "COMPLIANT" | "VIOLATION" | "NEEDS_REVIEW",
  "policy_rule_id": "<rule_id or null>",
  "reason": "<one sentence explanation>"
}

Policy Rule IDs:
- RULE_101: Drug name + dosage present
- RULE_102: Prescriptive clinical language
- RULE_103: Definitive diagnosis without hedging
- RULE_104: Dosage modification advice
- RULE_105: Treatment-intent medicine recommendation
```

---

## 8. System Architecture

```
User Request
     │
     ▼
┌─────────────────────────┐
│  Request Interceptor     │  ← Compliance classification (LLM call)
│  (Middleware Layer)      │  ← Keyword/regex pre-filter
└────────┬────────────────┘
         │ COMPLIANT / NEEDS_REVIEW          │ VIOLATION
         ▼                                   ▼
┌─────────────────────────┐        ┌──────────────────────────┐
│   Supervisor Agent       │        │  Block + Log + Return     │
│   (qwen/qwen3-32b)       │        │  Safe Fallback Message    │
└────────┬────────────────┘        └──────────────────────────┘
         │ Routes to specialist
         ▼
┌─────────────────────────┐
│  Specialist Agent(s)    │
│  (llama-3.1-8b-instant) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Response Interceptor   │  ← Compliance classification (LLM call)
│  (Middleware Layer)      │
└────────┬────────────────┘
         │ COMPLIANT                          │ VIOLATION
         ▼                                   ▼
  Stream response to user         Block + Log + Return Safe Fallback

         │ (All paths)
         ▼
┌─────────────────────────┐
│   Async Audit Logger    │  → PostgreSQL (AgentAuditLog)
└─────────────────────────┘
```

---

## 9. API Endpoints

### 9.1 Compliance Middleware (Internal)

These are not public-facing endpoints — they are called internally by the middleware layer.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/compliance/check-request` | Classify a user request |
| `POST` | `/api/compliance/check-response` | Classify an agent response |

### 9.2 Audit Log Query API (Internal / Admin)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audit/logs` | Query logs with filters |
| `GET` | `/api/audit/logs/:id` | Retrieve a single log record |
| `GET` | `/api/audit/sessions/:sessionId` | Retrieve all logs for a session |
| `GET` | `/api/audit/violations` | Retrieve only violation records |

**Query Parameters for `GET /api/audit/logs`:**

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | string | Filter by session |
| `agentType` | `SUPERVISOR` \| `SPECIALIST` | Filter by agent type |
| `complianceStatus` | `COMPLIANT` \| `VIOLATION` \| `NEEDS_REVIEW` | Filter by status |
| `violationType` | string | Filter by specific rule ID |
| `from` | ISO 8601 datetime | Start of time range |
| `to` | ISO 8601 datetime | End of time range |
| `page` | integer | Pagination |
| `limit` | integer | Records per page (max 100) |

---

## 10. Implementation Plan

### Phase 1 — Foundation (Week 1–2)

- Define and migrate the `AgentAuditLog` Prisma schema.
- Build the async audit logger service.
- Instrument existing Supervisor and Specialist agent calls to emit log events.
- Write unit tests for the logger.

### Phase 2 — Compliance Interceptors (Week 3–4)

- Implement the Request Compliance Interceptor middleware.
- Implement the Response Compliance Interceptor middleware.
- Integrate LLM-based classifier with prompt specifications from Section 7.
- Add keyword/regex pre-filter layer for latency optimization.
- Wire interceptors into the Next.js API route pipeline.

### Phase 3 — Integration & Validation (Week 5)

- End-to-end testing across all 10+ specialist agent domains.
- Latency benchmarking (target: < 200ms overhead per interceptor call).
- Red-teaming: attempt to elicit prescription content and verify blocks.
- Review log completeness and data integrity.

### Phase 4 — Audit API & Observability (Week 6)

- Build the internal audit log query API.
- Add alerting for elevated violation rates (threshold-based).
- Internal compliance review with stakeholders.
- Documentation and handoff.

---

## 11. Acceptance Criteria

| ID | Criterion | Test Method |
|---|---|---|
| AC-01 | A request asking for "prescribe me amoxicillin 500mg" is blocked before reaching the Supervisor Agent | Integration test |
| AC-02 | A response containing "take 10mg of lisinopril daily" is blocked and replaced with the fallback message | Integration test |
| AC-03 | A compliant symptom query ("I have a headache and fever") passes through unmodified | Integration test |
| AC-04 | Every Supervisor and Specialist agent call produces a log record in `AgentAuditLog` | Database assertion |
| AC-05 | Blocked requests and responses each produce a log record with `blocked: true` | Database assertion |
| AC-06 | Log records do not contain raw user messages or raw AI responses | Security audit |
| AC-07 | Compliance check adds fewer than 200ms latency on p95 | Load test |
| AC-08 | Audit log query API returns correct filtered results for all supported parameters | API test |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Classifier false positives block legitimate symptom descriptions | Medium | High | Tune prompts; implement `NEEDS_REVIEW` tier with relaxed thresholds; monitor false-positive rate post-launch |
| Classifier latency degrades user experience | Medium | Medium | Use a fast, low-parameter model for classification; add regex pre-filter to catch obvious cases without LLM call |
| Users attempt prompt injection to bypass compliance checks | High | High | Classify the raw user input, not a transformed version; never trust agent-reformulated input as safe |
| Log volume grows rapidly at scale | Low | Medium | Partition `AgentAuditLog` by month; implement a retention policy (e.g., 90-day hot storage, archive thereafter) |
| Compliance rules become outdated | Low | High | Assign a rule owner; schedule quarterly policy review |

---

## 13. Out of Scope (Future Phases)

- Real-time clinician review queue for `NEEDS_REVIEW` flagged interactions.
- PHI-aware storage with full HIPAA technical safeguards.
- Multi-language compliance detection (currently English only).
- Automated regulatory reporting exports.
- User-facing transparency report ("your request was reviewed for compliance").

---

## 14. Dependencies

| Dependency | Owner | Notes |
|---|---|---|
| PostgreSQL / Prisma ORM | Platform Infra | Schema migration required |
| Groq API | External | Used for compliance classifier LLM calls |
| LangChain.js / DeepAgents | AI Team | Middleware must hook into agent invocation lifecycle |
| Next.js 16 API Routes | Frontend/Backend | Interceptor middleware registered here |

---

## 15. Glossary

| Term | Definition |
|---|---|
| **Compliance Interceptor** | Middleware that classifies and optionally blocks requests or responses based on policy rules |
| **Supervisor Agent** | The General Practitioner-role AI that routes queries to specialist sub-agents |
| **Specialist Agent** | A domain-specific sub-agent (e.g., Cardiologist, Dermatologist) invoked by the Supervisor |
| **Trace ID** | A unique identifier linking the Supervisor call and all Specialist calls for a single user query |
| **Session ID** | A unique identifier grouping all queries within a single user session |
| **NEEDS_REVIEW** | A compliance status indicating borderline content that passes to the agent pipeline but is logged for heightened scrutiny |
| **Policy Rule ID** | A short code identifying which specific compliance rule was triggered |
| **PHI** | Protected Health Information — any data that could identify a patient |