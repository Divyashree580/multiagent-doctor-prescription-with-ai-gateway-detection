# Frontend Access Guide - Compliance & Safety Dashboard

## 📍 Frontend Endpoints & Routes

Your medical safety and compliance dashboard has **three main frontend pages** with comprehensive violation monitoring:

### **1. Compliance Dashboard**
**URL:** `http://localhost:3000/compliance`

**Features:**
- ✅ Real-time compliance statistics
- ✅ Violation breakdown by type, agent, and direction
- ✅ Recent violations list (last 10)
- ✅ Performance metrics (average latency)
- ✅ Block rate percentage
- ✅ Trend analysis charts
- ✅ Compliance percentage overview
- ✅ Agent performance breakdown

**Component:** `components/compliance/ComplianceDashboard.tsx`

---

### **2. Violations Report Page**
**URL:** `http://localhost:3000/violations`

**Features:**
- ✅ Comprehensive violations table with all details
- ✅ Date range filtering (From/To)
- ✅ Show blocked violations only or all violations
- ✅ Severity badges (CRITICAL, WARNING)
- ✅ Policy rule reference legend
- ✅ Pagination (20 per page)
- ✅ Violation sorting and filtering
- ✅ Content summary preview

**Component:** `app/violations/page.tsx`

**Filters Available:**
- Date range picker
- Block status filter (Blocked only / All violations)
- Pagination controls

---

### **3. Medical Safety Compliance**
**URL:** `http://localhost:3000/compliance`

**Detailed Views:**
- Compliance statistics component
- Violation list with details
- Violation trend charts
- Audit log viewer
- Violation detail modals

---

## 🔌 API Endpoints (Backend)

All frontend pages connect to these REST API endpoints:

### **Query Violations**
```
GET /api/audit/violations
Parameters:
  - from: ISO 8601 date (e.g., 2026-03-26T00:00:00Z)
  - to: ISO 8601 date
  - blockedOnly: boolean
  - page: number
  - limit: number (1-100)
  - agentType: SUPERVISOR|SPECIALIST
  - violationType: string

Response: { success, data, pagination, summary }
```

**Example Request:**
```bash
curl "http://localhost:3000/api/audit/violations?from=2026-03-26T00:00:00Z&to=2026-03-27T00:00:00Z&blockedOnly=true&page=1&limit=20"
```

---

### **Get Compliance Statistics**
```
GET /api/audit/stats
Parameters:
  - from: ISO 8601 date
  - to: ISO 8601 date
  - sessionId: string (optional)

Response: {
  success,
  data: {
    overview: { totalLogs, compliant, violations, blocked, ... },
    breakdown: { byAgentType, byCallDirection, byViolationType },
    performance: { averageLatencyMs },
    recentViolations: [ ... ]
  }
}
```

**Example Request:**
```bash
curl "http://localhost:3000/api/audit/stats?from=2026-03-26T00:00:00Z&to=2026-03-27T00:00:00Z"
```

---

### **Get Session Logs**
```
GET /api/audit/sessions/:sessionId
Parameters:
  - page: number
  - limit: number

Response: { success, data, pagination }
```

---

### **Get Single Log**
```
GET /api/audit/logs/:logId

Response: { success, data }
```

---

### **Query All Logs**
```
GET /api/audit/logs
Parameters:
  - sessionId: string
  - agentType: SUPERVISOR|SPECIALIST
  - complianceStatus: COMPLIANT|VIOLATION|NEEDS_REVIEW
  - violationType: string
  - from: ISO 8601 date
  - to: ISO 8601 date
  - page: number
  - limit: number

Response: { success, data, pagination }
```

---

## 🎨 Frontend Components Built

### **Main Components:**
1. **ComplianceDashboard** - Overall dashboard with stats
2. **ViolationsList** - Table of violations with details
3. **ComplianceStats** - Statistics cards and metrics
4. **ViolationTrend** - Charts and trend analysis
5. **AuditLogViewer** - Detailed audit log viewer
6. **ViolationDetailModal** - Modal for violation details

### **Layout Structure:**
```
/app
├── /compliance
│   └── page.tsx (Compliance Dashboard)
├── /violations
│   └── page.tsx (Violations Report)
└── /layout.tsx (Main layout)

/components/compliance
├── ComplianceDashboard.tsx
├── ViolationsList.tsx
├── ComplianceStats.tsx
├── ViolationTrend.tsx
├── AuditLogViewer.tsx
└── ViolationDetailModal.tsx
```

---

## 📊 What You Can View & Access

### **On Compliance Dashboard (`/compliance`)**
- Total violations summary
- Compliance percentage
- Block rate percentage
- Violations by type breakdown
- Violations by agent breakdown
- Violations by call direction
- Average compliance check latency
- Recent violations (last 10)
- Trends and charts

### **On Violations Report (`/violations`)**
- Complete table of all violations
- Filter by date range
- Show only blocked or all violations
- Column details:
  - Time of violation
  - Policy rule ID (RULE_001, RULE_101, etc.)
  - Severity (CRITICAL, WARNING)
  - Violation type description
  - Agent type (SUPERVISOR, SPECIALIST)
  - Call direction (REQUEST, RESPONSE)
  - Status (Blocked/Flagged)
  - Content summary

---

## 🔐 Violation Classification Reference

### **Critical Violations (🚫 Block Immediately)**
- **RULE_001**: Prescription requests
- **RULE_002**: Controlled substance requests
- **RULE_003**: Self-harm requests
- **RULE_004**: Prescription document requests
- **RULE_101**: Drug + dosage combinations
- **RULE_102**: Prescriptive clinical language
- **RULE_104**: Dosage modification advice

### **Warning Violations (⚠️ Flag for Review)**
- **RULE_005**: Professional impersonation
- **RULE_103**: Firm diagnosis without hedging
- **RULE_105**: Treatment-intent recommendations

---

## 🚀 Quick Start - Accessing the Dashboard

### **Step 1: Start Your Application**
```bash
npm run dev
```

### **Step 2: Navigate to Dashboard**
Open your browser and go to:
```
http://localhost:3000/compliance
```

### **Step 3: View Violations**
Click on violations section or navigate to:
```
http://localhost:3000/violations
```

---

## 📱 Dashboard Features

### **Compliance Dashboard (`/compliance`)**
- Real-time statistics card
- Compliance percentage gauge
- Violation breakdown charts
- Recent violations widget
- Trends over time
- Performance metrics

### **Violations Report (`/violations`)**
- Sortable table
- Date range filtering
- Pagination controls
- Severity color coding:
  - 🔴 CRITICAL (Red)
  - 🟡 WARNING (Yellow)
- Block status badges
- Export/filter capabilities

---

## 📈 Data Visualization

The dashboard includes:
- **Pie Charts**: Violation breakdown by type
- **Bar Charts**: Violations by agent type
- **Line Charts**: Violation trends over time
- **Stat Cards**: Key metrics (total, blocked, compliance %)
- **Tables**: Detailed violation records

---

## 🔍 How to Interpret the Data

### **Compliance Percentage**
- 100% = No violations detected
- < 95% = Some violations present
- < 90% = High violation rate - review needed

### **Block Rate**
- High block rate = System successfully catching violations
- Low block rate = More violations flagged for review

### **Recent Violations**
- Most recent violations shown at top
- Includes severity and type information
- Quick access to full details

---

## 🛠️ Frontend Technology Stack

- **Framework**: Next.js 16 (React)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: React Hooks (useState)
- **Data Fetching**: Fetch API
- **Charts**: Recharts (if implemented)

---

## ✅ Testing the Frontend

### **Test 1: View Recent Violations**
1. Navigate to `/violations`
2. Set date to last 7 days
3. Click "Apply Filters"
4. View list of all violations

### **Test 2: Filter by Date**
1. Go to `/compliance`
2. Check statistics for last 24 hours
3. View recent violations widget

### **Test 3: Check Compliance**
1. Navigate to `/compliance`
2. Check overall compliance percentage
3. See block rate statistics

---

## 🔗 Navigation Links

From your main app navigation, add these links:

```typescript
// Add to your navigation menu
[
  { href: '/compliance', label: 'Compliance Dashboard' },
  { href: '/violations', label: 'Violations Report' },
  { href: '/dashboard', label: 'Medical Dashboard' },
]
```

---

## 📞 Support & Monitoring

Monitor from these pages:
- **Real-time Dashboard**: `/compliance`
- **Historical Violations**: `/violations`
- **API Health**: Check `/api/audit/stats` endpoint
- **System Performance**: View latency metrics on dashboard

---

## 🎯 Summary

**To access violations and compliance metrics:**
1. Dashboard: `http://localhost:3000/compliance`
2. Violations Report: `http://localhost:3000/violations`
3. Backend APIs: See endpoints above

Both pages automatically fetch and display compliance data from your audit logging system.
