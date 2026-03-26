# Doctor Assistant - Project Overview

## 📖 Project Description
**Doctor Assistant** is an advanced healthcare platform powered by a **Multi-Agent AI System**. Rather than relying on a generic chatbot, it takes a specialized approach by orchestrating a team of digital medical experts. The application analyzes patient symptoms, determines the relevant medical field, and provides preliminary diagnoses and health recommendations using specialized domain knowledge.

> **Note:** The platform includes a disclaimer that it is for informational purposes only and does not replace professional medical advice.

## 🌟 Key Features

1. **Multi-Agent AI Architecture (Supervisor-Specialist Pattern)**
   * **Supervisor Agent**: Acts like a General Practitioner, analyzing text intent and intelligent routing to the right expert. Powered by `qwen/qwen3-32b`.
   * **Specialized Agents**: 10+ dedicated sub-agents loaded with deep specific domain knowledge (Cardiologist, Dermatologist, Neurologist, Pediatrician, Psychiatrist, etc.). Powered by `llama-3.1-8b-instant`.

2. **Medicine Alternatives & Search**
   * Instant search for medicines and visual presentation of details in structured tables.
   * AI-driven recommendations for generic or cheaper medical alternatives, paired with simplified side-effect and dosage information.

3. **Audio & Translation Capabilities**
   * The presence of `speech-to-text/` and `text-translation/` directories indicates the platform handles audio input (Speech-to-Text) and potentially multi-language translation.

4. **High-Performance Architecture**
   * Utilizes Groq's fast LPU inference engine for rapid responses and LangChain.js / DeepAgents for AI orchestration.

## 📂 Current Project Structure
The project is built as a modern web application using **Next.js 16, React 19, Tailwind CSS v4, and PostgreSQL (via Prisma ORM)**.

### Core Application
* `app/` - The Next.js App Router containing pages, layouts, and API routes.
* `components/` - Reusable UI components (integrates Radix UI / shadcn). 
* `lib/` - Shared utilities, helper functions, and possibly database/service clients.
* `public/` - Static assets like images and icons.

### AI & Domain Features
* `deep-agent/` - Contains the logic for the LangChain integration and specialized medical AI agents.
* `speech-to-text/` - Modules and scripts handling voice/audio transcription features.
* `text-translation/` - Modules designated for language localization or translating medical responses.

### Database
* `prisma/` - Contains your `schema.prisma` definitions for PostgreSQL and database migration history. 

### Configuration & Documentation
* `package.json` / `next.config.ts` / `tsconfig.json` / `postcss.config.mjs` - Standard configuration files for Next.js, TypeScript, and styling.
* `components.json` - Configuration likely for your UI components (shadcn/ui setup).
* **Reference Markdown Files**: Extensive documentation files like `QUICK_REFERENCE.md`, `VISUAL_DIAGRAMS.md`, `TESTING_GUIDE.md`, and specific guides for `AUDIO_STT` and `TRANSLATOR_LAYOUT_UPDATE`, which track development constraints and layout directions.
