# Enhanced Logging System - Implementation Guide

## Overview
The logging system has been completely enhanced to display normal logs, alert logs, and detailed compliance traces. All logs now include explanations for why rules were triggered and broken.

## Key Features

### 1. Log Categorization
- **Normal Logs**: Compliant interactions that passed all checks (✓)
- **Alert Logs**: Violations and blocked interactions (⚠️)
- **View All**: Combined view of all logs

### 2. Log Trace Viewer Component (New)
Located: `components/compliance/LogTraceViewer.tsx`

Features:
- **Overview Tab**: Shows summary, content, and explanation
- **Violations Tab**: Details about what rule was broken and why
- **Trace Tab**: Step-by-step compliance check process
- **Metadata Tab**: Full technical details (IDs, timestamps, etc.)

### 3. Enhanced Audit Log Viewer
Located: `components/compliance/AuditLogViewer.tsx`

Features:
- Tab-based filtering (All | Normal | Alert)
- Advanced search and filtering
- Selected log detail view with full trace
- Color-coded cards for quick visual recognition
- Displays:
  - Violation type and rule ID
  - Why the rule was broken
  - Content summary
  - Compliance check traces

### 4. Violation Details Display
Each violation now shows:
- **Explanation**: Why this log triggered (e.g., "AI cannot prescribe medications")
- **Reason**: Why the rule was broken (detailed breakdown)
- **Related Rules**: All 7 compliance rules and which ones triggered
- **Trace Steps**: 4-step compliance check process

## Compliance Rules

### Implemented Rules:
1. **RULE_001**: No Prescription Recommendations
2. **RULE_002**: Controlled Substances Prohibition
3. **RULE_003**: Self-Harm Prevention
4. **RULE_004**: No Dosage Instructions
5. **RULE_005**: Professional Authenticity
6. **RULE_006**: No Definitive Diagnoses
7. **RULE_007**: No Illegal Activity

Each rule has:
- Clear explanation of what it prevents
- Human-readable reason for violations
- Automatic detection and classification

## Violation Types Covered

| Type | Rule | Explanation |
|------|------|-------------|
| PRESCRIPTION_DETECTED | RULE_001 | Cannot provide prescription recommendations |
| CONTROLLED_SUBSTANCE_DETECTED | RULE_002 | Cannot discuss controlled substances |
| SELF_HARM_REQUEST | RULE_003 | Immediate block for self-harm content |
| DOSAGE_ADVICE_DETECTED | RULE_004 | Cannot provide dosage instructions |
| ILLEGAL_ACTIVITY_DETECTED | RULE_007 | Cannot assist with illegal activities |
| PROFESSIONAL_IMPERSONATION | RULE_005 | Cannot claim to be a licensed professional |
| DIAGNOSTIC_CLAIM | RULE_006 | Cannot make definitive diagnoses |

## API Enhancements

### GET /api/audit/logs
Now returns enriched logs with:
```json
{
  "id": "log_id",
  "sessionId": "session_id",
  "complianceStatus": "VIOLATION",
  "violationType": "PRESCRIPTION_DETECTED",
  "explanation": "The response contains prescription recommendations...",
  "reason": "Rule: No medication prescriptions. Breaking reason: ...",
  // ... other fields
}
```

### GET /api/audit/logs/:id
Returns detailed log with:
```json
{
  "id": "log_id",
  // ... all log fields
  "explanation": "Human-readable explanation",
  "reason": "Detailed reason for violation",
  "relatedRules": [
    {
      "ruleId": "RULE_001",
      "ruleName": "No Prescription Recommendations",
      "triggered": true,
      "reason": "AI cannot prescribe medications..."
    },
    // ... other rules
  ],
  "trace": [
    {
      "step": 1,
      "action": "Content Ingestion",
      "result": "SUCCESS",
      "details": "Agent response received..."
    },
    // ... trace steps
  ]
}
```

## Backend Updates

### auditLogger.ts
New methods added to `AuditLogger` utility class:

#### `generateViolationExplanation(violationType, contentSummary, complianceStatus)`
Generates human-readable explanation for why a log violated rules.

Example:
```typescript
const explanation = AuditLogger.generateViolationExplanation(
  'PRESCRIPTION_DETECTED',
  'Response with medication recommendations',
  'VIOLATION'
);
// Returns: "The response contains prescription recommendations, which is not allowed..."
```

#### `generateRuleBreakdownReason(violationType)`
Generates detailed explanation of why a specific rule was broken.

Example:
```typescript
const reason = AuditLogger.generateRuleBreakdownReason('PRESCRIPTION_DETECTED');
// Returns: "Rule: No medication prescriptions. Breaking reason: Medical prescription advice was provided..."
```

### LogEntry Interface
Enhanced with new fields:
```typescript
interface LogEntry {
  // ... existing fields
  explanation?: string;        // Why was the violation triggered
  detailedReason?: string;     // Why was the rule broken
}
```

## UI Components

### AuditLogViewer.tsx
```tsx
<AuditLogViewer />
```
Main component for viewing and filtering audit logs with:
- Tab-based filtering (All/Normal/Alert)
- Advanced search
- Selected log detail viewing
- Automatic log enrichment

### LogTraceViewer.tsx
```tsx
<LogTraceViewer log={logData} />
```
Detailed trace viewer component with four tabs:
- Overview
- Violations
- Trace
- Metadata

### ViolationDetailModal.tsx
```tsx
<ViolationDetailModal 
  violation={violationData}
  open={isOpen}
  onOpenChange={setIsOpen}
/>
```
Enhanced modal that uses LogTraceViewer internally.

### ViolationsList.tsx
Updated to display:
- Violation type with description
- Why rule was broken
- Content summary
- Better visual hierarchy

## Color Coding

- **Green**: Compliant logs (✓) - No issues
- **Yellow**: Needs Review - Potential concern
- **Red**: Violations/Blocked (⚠️) - Rule broken

## Trace Information

Each violation now shows a step-by-step trace:
1. **Content Ingestion**: Response received and scheduled for check
2. **Text Analysis**: Content processed through safety detectors
3. **Rule Matching**: Rules evaluated, violations detected
4. **Violation Classification**: Type identified and action taken

## Usage Examples

### View All Logs
- Navigate to compliance page
- Default shows all logs with full details

### Filter by Status
- Use tabs: All | ✓ Normal | ⚠️ Alerts
- Each tab shows relevant logs

### View Detailed Trace
- Click on any log
- LogTraceViewer opens showing all details
- Switch between tabs for different information

### Search for Specific Log
- Use Session ID field
- Use filters for Agent Type, Status, Violation Type
- Results automatically enriched with explanations

## Testing Checklist

- [ ] View compliance dashboard
- [ ] Filter logs by normal vs alert
- [ ] Click on alert log to see detailed trace
- [ ] Verify explanation shows why rule triggered
- [ ] Check "Why Rule Broken" section
- [ ] View related rules list
- [ ] Check trace steps display correctly
- [ ] Test search/filter combinations
- [ ] Verify color coding displays properly
- [ ] Test pagination with real data

## Files Modified

1. `components/compliance/LogTraceViewer.tsx` - NEW
2. `components/compliance/AuditLogViewer.tsx` - Enhanced
3. `components/compliance/ViolationDetailModal.tsx` - Enhanced
4. `components/compliance/ViolationsList.tsx` - Enhanced
5. `lib/compliance/auditLogger.ts` - Enhanced
6. `app/api/audit/route.ts` - Enhanced
7. `app/api/audit/[id]/route.ts` - Enhanced

## Future Enhancements

1. Export detailed trace reports as PDF
2. Email notifications for critical violations
3. Custom rule creation interface
4. Advanced analytics on violation patterns
5. Automated remediation suggestions
6. Rule tuning based on false positives
7. Integration with external incident tracking systems
