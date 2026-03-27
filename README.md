# 🩺 Svasthya: Medical Assistant with Multi LLM based multi agent AI with AI security(AI Gateway)

An advanced healthcare assistant powered by a **Multi-Agent AI System** and protected by a robust **AI Security Gateway**. This application orchestrates a team of specialized medical agents to provide accurate, domain-specific preliminary diagnoses and health recommendations based on patient symptoms, while strictly enforcing medical compliance and safety.

## 🌟 The Problem & Solution

### The Problem: Rural Healthcare Gaps
Rural physicians often face a critical shortage of specialized medical professionals. When a complex case arrives, doctors are forced to make immediate triage decisions without the benefit of expert consultation. Furthermore, traditional healthcare chatbots are notoriously dangerous—they either provide dangerously generalized advice, illegally prescribe controlled substances, or fail to understand nuanced medical context.

### The Solution: Svasthya's Intelligent Ecosystem
We built a highly strictly governed, multi-agent AI system that acts as a secure clinical decision support tool:
1. **Uncompromised Safety:** An API Gateway guarantees that no illegal prescriptions or harmful diagnoses reach the patient.
2. **Specialist-Level Insights:** A suite of 10 deeply prompted LLM specialists (Cardiology, Dermatology, etc.) that the Supervisor Agent dynamically routes to.
3. **Affordability:** Cross-referencing prescribed drugs to surface affordable, generic medicine alternatives.
4. **Multilingual Access:** Breaking down language barriers to ensure precise patient-doctor communication.

---

## 🛡️ Core Feature: LLM-Based AI Security Gateway

At the center of the platform is an intelligent, **LLM-Based AI Security Gateway**. Rather than acting as a simple text passthrough, this Gateway fundamentally operates as a highly secure, autonomous router. **It is an LLM that controls other LLMs**.

Every single user prompt and AI response passes through this bidirectional Gateway layer to ensure medical constraints are maintained while dynamically orchestrating multiple downstream Specialist AIs.

```text
  [ Patient Request ]
           │
           ▼
  +-------------------------------------------------------------+
  |              🛡️ SVASTHYA AI SECURITY GATEWAY              |
  |                                                             |
  |   1. Inbound Classifier (llama-3)                           |
  |      [ Reject ] <───── (Violation) ─────> [ Pass Context ]  |
  |          │                                       │          |
  |          ▼                                       ▼          |
  |     (Logs to DB)             2. Supervisor Router (qwen3)   |
  |                                       │                     |
  |                   ┌───────────────────┼───────────────────┐ |
  |                   ▼                   ▼                   ▼ |
  |            [ Cardio LLM ]      [ Psych LLM ]      [ Skin LLM] |
  |                   │                   │                   │ |
  |                   └───────────────────┼───────────────────┘ |
  |                                       ▼                     |
  |                      3. Outbound Security Filter            |
  |             [ Clean ] <───────> [ Restricted Meds ]         |
  |                 │                       │                   |
  |                 │                       ▼                   |
  |                 │           [ Dynamic Redaction Engine ]    |
  |                 │                       │                   |
  |                 └───────────┬───────────┘                   |
  |                             ▼                               |
  |                     [ Final Response ]                      |
  +-----------------------------│-------------------------------+
                                ▼
                        [ Back to Patient ]
```

### 1. Dynamic LLM-to-LLM Routing
When a user submits a complex medical problem, the primary Gateway LLM (`qwen/qwen3-32b`) dynamically determines intent. Based on the request, it securely routes the specific context (like symptoms and age) to one or multiple independent **Specialist LLMs** (`llama-3.1-8b-instant`). The Gateway then coordinates their responses, synthesizing a safe final output.

### 2. Inbound Interception (Pre-filtering)
Before any heavy reasoning begins, inbound requests are scrutinized by an ultra-fast security classifier LLM. 
*   **Trigger Blocks:** Instantly rejects explicit prescription requests (`RULE_001`), controlled substance acquisition (`RULE_002`), self-harm intent (`RULE_003`), and professional impersonation (`RULE_005`).

### 3. Outbound Security & Dynamic Redaction
If one of the Specialist LLMs breaks character and suggests a specific pharmaceutical dosage (e.g., *"Take 500mg of Metformin"*), the Gateway's Outbound Security interceptor triggers the **Redaction Engine**. 
*   It does **not** blindly block the helpful context. 
*   Instead, it surgically redacts the offending drug name and dosage (`Take ***** of *****`), preserving the educational medical text while remaining 100% legally compliant (`RULE_101 - RULE_105`).

### 4. Asynchronous Audit Logging
Every LLM-to-LLM route, latency metric, user interaction, and policy block is hashed and logged to a PostgreSQL instance via Prisma, allowing admins to track AI trajectories across the network without affecting user-facing response times.

---

## 🤖 The Specialist LLM Network

This system completely abandons monolithic chatbots in favor of a specialized network of secure bots dynamically coordinated by the Gateway:

*   **Gateway / Supervisor LLM (`qwen/qwen3-32b`)**: Acts as the intelligent traffic director. It analyzes patient input, enforces security boundaries, and routes the case to the appropriate specialist.
*   **Specialist LLMs (`llama-3.1-8b-instant`)**: A protected team of 10+ downstream tool agents, each prompted with incredibly deep, narrow domain knowledge to prevent Categorical Hallucination:
    *   🫀 Cardiologist
    *   🧴 Dermatologist
    *   🧠 Neurologist
    *   👁️ Ophthalmologist
    *   🦴 Orthopedist
    *   🤰 Gynecologist
    *   👂 ENT Specialist
    *   🧠 Psychiatrist
    *   👶 Pediatrician

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 16, React 19, Tailwind CSS v4
*   **AI Orchestration**: LangChain.js, LangGraph
*   **LLM Provider**: Groq API (LPU Inference Engine)
*   **Database & Auth**: PostgreSQL, Prisma ORM
*   **UI Components**: Radix UI, Lucide React

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A Groq API Key
*   A PostgreSQL Database string

### Installation
1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up Environment Variables**:
    Create a `.env` file with your keys:
    ```env
    GROQ_API_KEY=your_groq_api_key
    DATABASE_URL=your_postgres_url
    ```
4.  **Database Migration**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
5.  **Run the development server**:
    ```bash
    npm run dev
    ```

> **Disclaimer**: *The Svasthya AI assistant is for informational and preliminary diagnostic support purposes only. It does not replace professional medical advice. Always consult a certified healthcare provider for diagnosis and treatment.*
