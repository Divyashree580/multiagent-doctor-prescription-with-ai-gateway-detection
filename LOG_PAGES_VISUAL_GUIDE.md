# Log Pages - Visual Structure

## Audit Log Viewer Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Audit Log Viewer                                               │
│  Monitor all requests and responses with detailed traces        │
└─────────────────────────────────────────────────────────────────┘

┌─── Log Categories ──────────────────────────────────────────────┐
│ [All Logs (523)] [✓ Normal (487)] [⚠️ Alerts (36)]             │
└─────────────────────────────────────────────────────────────────┘

┌─── Filter & Search ─────────────────────────────────────────────┐
│ Session ID: [________________]                                  │
│ Agent Type: [All Agents ▼]   Status: [All Statuses ▼]          │
│ Violation Type: [________________]                              │
│ [Apply Filters] [Reset]                                         │
└─────────────────────────────────────────────────────────────────┘

┌─ Selected Log Details ──────────────────────────────────────────┐
│ 👔 📤 [VIOLATION] [🚫 BLOCKED] [SUPERVISOR] [REQUEST]          │
│                                                                 │
│ ┌─ Overview ─ Violations ─ Trace ─ Metadata ─┐               │
│ │ Session: log_abc123...  Trace: trace_001... │               │
│ │ Rule: RULE_001          Latency: 245ms      │               │
│ │                                              │               │
│ │ Content Summary:                             │               │
│ │ [Response contains medication dosage info]  │               │
│ │                                              │               │
│ │ Why Rule Broken:                            │               │
│ │ [The response contains prescription advice] │               │
│ │                                              │               │
│ │ Explanation:                                 │               │
│ │ [AI assistants cannot prescribe...]         │               │
│ └──────────────────────────────────────────────┘               │
│ [Close ×]                                                       │
└─────────────────────────────────────────────────────────────────┘

┌─ Alert Logs (36) ───────────────────────────────────────────────┐
│                                                                 │
│ ⚠️ [VIOLATION] [SPECIALIST] [🚫 BLOCKED]  [View Details →]     │
│                                                                 │
│ Rule: RULE_001         Violation: PRESCRIPTION DETECTED        │
│                                                                 │
│ Why Rule Broken:                                                │
│ [Medical prescription advice was provided in the response]     │
│                                                                 │
│ Summary:                                                        │
│ [Response recommends specific medications...]                  │
│                                                                 │
│ Session: session_456... | 2024-03-26 10:45:32                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Page 1 of 2 • 36 total logs          [← Previous] [Next →]    │
└─────────────────────────────────────────────────────────────────┘
```

## Log Trace Viewer (Detailed View)

```
┌─────────────────────────────────────────────────────────────────┐
│ 👔 📥 [NEEDS_REVIEW] [⚠️ SUPERVISOR] [REQUEST] ✕ Close        │
│ 2024-03-26 10:45:32 | Latency: 245ms                          │
├─────────────────────────────────────────────────────────────────┤
│ Overview │ Violations │ Trace │ Metadata                       │
│                                                                 │
│ Session ID: session_abc123...                                  │
│ Trace ID: trace_def456...                                      │
│                                                                 │
│ Content Summary:                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Response discusses medical conditions and treatments...    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Why This Log?                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ The response contains prescription recommendations, which  │ │
│ │ is not allowed. AI assistants cannot prescribe meds.      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Explanation                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AI assistants cannot provide medication prescriptions as   │ │
│ │ this requires licensed medical professionals.              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Violations Tab Detail

```
┌──────────────────────────────────────────────────────────────────┐
│ Violation Detected                                               │
│                                                                  │
│ Violation Type: PRESCRIPTION DETECTED                            │
│ Policy Rule: RULE_001                                            │
│                                                                  │
│ Why Rule Was Broken:                                             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Rule: No medication prescriptions. Breaking reason:          │ │
│ │ Medical prescription advice was provided in the response,   │ │
│ │ violating the prohibition on prescriptive medical guidance. │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Related Rules Checked:                                           │
│                                                                  │
│ ✅ RULE_001: No Prescription Recommendations                    │
│    RULE_001                                                     │
│    ✗ Triggered - Medical prescription advice was provided      │
│                                                                  │
│ ✓ RULE_002: Controlled Substances Prohibition                  │
│    RULE_002                                                     │
│    ✓ Passed - No controlled substances detected                │
│                                                                  │
│ ✓ RULE_003: Self-Harm Prevention                                │
│    RULE_003                                                     │
│    ✓ Passed - No self-harm content detected                     │
│                                                                  │
│ ✓ RULE_004: No Dosage Instructions                              │
│    RULE_004                                                     │
│    ✓ Passed - No explicit dosage advice                         │
│                                                                  │
│ ✓ RULE_005: Professional Authenticity                           │
│    RULE_005                                                     │
│    ✓ Passed - No impersonation claims                           │
│                                                                  │
│ ✓ RULE_006: No Definitive Diagnoses                             │
│    RULE_006                                                     │
│    ✓ Passed - No definitive diagnoses made                      │
│                                                                  │
│ ✓ RULE_007: No Illegal Activity                                 │
│    RULE_007                                                     │
│    ✓ Passed - No illegal activity detected                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Trace Tab Detail

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│ 1 [Content Ingestion]                                            │
│   ✓ SUCCESS                                                      │
│   [Agent response received and scheduled for compliance check]   │
│                                                                  │
│ 2 [Text Analysis]                                                │
│   ✓ SUCCESS                                                      │
│   [Content processed through medical safety detector]            │
│                                                                  │
│ 3 [Rule Matching]                                                │
│   ✗ VIOLATION_FOUND                                              │
│   [Violation detected: PRESCRIPTION_DETECTED]                    │
│                                                                  │
│ 4 [Violation Classification]                                     │
│   ✗ VIOLATION_CLASSIFIED                                         │
│   [Violation type: PRESCRIPTION_DETECTED - Content blocked]      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Log List Item - Normal Log

```
┌──────────────────────────────────────────────────────────────────┐
│ ✓ [COMPLIANT] [SUPERVISOR] [RESPONSE]                            │
│                                                                  │
│ Rule: RULE_003              Latency: 124ms                       │
│                                                                  │
│ Session: session_xyz789... | 2024-03-26 10:42:15               │
└──────────────────────────────────────────────────────────────────┘
```

## Log List Item - Alert Log

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️ [VIOLATION] [SPECIALIST] [🚫 BLOCKED] [View Details →]       │
│                                                                  │
│ Rule: RULE_001      Violation: PRESCRIPTION DETECTED            │
│                                                                  │
│ Why Rule Broken:                                                 │
│ [Medical prescription advice was provided in the response...]   │
│                                                                  │
│ Summary:                                                         │
│ [Response recommends specific medications for conditions...]    │
│                                                                  │
│ Session: session_abc... | 2024-03-26 10:40:22                  │
└──────────────────────────────────────────────────────────────────┘
```

## Key Features Visualization

### Color Scheme
- 🟢 Green: COMPLIANT ✓ - No issues detected
- 🟡 Yellow: NEEDS_REVIEW ⚠️ - Potential concern
- 🔴 Red: VIOLATION ✗ - Rule broken, blocked

### Badges & Icons
- 👔 = SUPERVISOR agent
- 🔧 = SPECIALIST agent
- 📤 = REQUEST direction
- 📥 = RESPONSE direction
- 🚫 = BLOCKED by compliance
- ✓ = PASSED check
- ✗ = FAILED/TRIGGERED
- ⚠️ = ALERT/WARNING

### Status Flow
```
Content Received
     ↓
Text Analysis
     ↓
Rule Matching
     ↓
RESULT: ┬─ COMPLIANT (Pass)
        ├─ NEEDS_REVIEW (Potential)
        └─ VIOLATION (Block + Log)
     ↓
Classification (if violation)
     ↓
Action: ALLOW or BLOCK
```

## Information Hierarchy

### Log Summary Level
- Status badge
- Agent type
- Call direction
- Rule ID
- Violation type (if applicable)
- Timestamp

### Log Detail Level (Expanded)
- All summary info
- Why rule was broken
- Content summary
- Session/trace IDs

### Full Trace View
- All detail info
- Related rules list
- Trace steps
- Technical metadata
- Complete explanations
