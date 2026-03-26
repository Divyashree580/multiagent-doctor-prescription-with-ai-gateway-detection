import { ChatGroq } from "@langchain/groq";

export type ComplianceStatus = "COMPLIANT" | "VIOLATION" | "NEEDS_REVIEW";

export interface ComplianceResult {
    status: ComplianceStatus;
    policyRuleId: string | null;
    reason: string;
    latencyMs?: number;
}

// Ensure deterministic outputs for compliance
const llm = new ChatGroq({
    model: "llama-3.1-8b-instant",
    apiKey: process.env.GROQ_API_KEY,
    maxRetries: 1,
    temperature: 0,
});

const DANGEROUS_PATTERNS = [
    /prescribe/i,
    /dosage for/i,
    /\b(adderall|xanax|oxycodone|fentanyl|vicodin)\b/i,
    /suicide/i,
    /kill myself/i
];

export async function checkRequestCompliance(requestText: string): Promise<ComplianceResult> {
    const start = Date.now();

    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(requestText)) {
            return {
                status: "VIOLATION",
                policyRuleId: "PRE_FILTER_REGEX",
                reason: "Request caught by fast-path dangerous pattern matching.",
                latencyMs: Date.now() - start
            };
        }
    }

    const prompt = `You are a compliance classifier for a medical AI platform. Your only job is to 
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
${requestText}
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
- RULE_005: Professional impersonation attempt`;

    try {
        const result = await llm.invoke([
            { role: "system", content: "You respond ONLY with valid JSON." },
            { role: "user", content: prompt }
        ], {
            response_format: { type: "json_object" }
        });

        const contentStr = result.content as string;
        // fallback regex parsing in case llm includes markdown codeblocks
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : contentStr;
        
        const responseJson = JSON.parse(jsonString);
        return {
            status: responseJson.status as ComplianceStatus,
            policyRuleId: responseJson.policy_rule_id || responseJson.policyRuleId || null,
            reason: responseJson.reason,
            latencyMs: Date.now() - start
        };
    } catch (e) {
        console.error("Compliance Check Error:", e);
        return {
            status: "NEEDS_REVIEW",
            policyRuleId: "ERR_CLASSIFIER_FAILED",
            reason: "LLM Classification failed, flagging for review.",
            latencyMs: Date.now() - start
        };
    }
}

export async function checkResponseCompliance(responseText: string): Promise<ComplianceResult> {
    const start = Date.now();
    const prompt = `You are a compliance classifier for a medical AI platform. Your only job is to 
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
${responseText}
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
- RULE_105: Treatment-intent medicine recommendation`;

    try {
        const result = await llm.invoke([
            { role: "system", content: "You respond ONLY with valid JSON." },
            { role: "user", content: prompt }
        ], {
            response_format: { type: "json_object" }
        });

        const contentStr = result.content as string;
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : contentStr;
        
        const responseJson = JSON.parse(jsonString);
        return {
            status: responseJson.status as ComplianceStatus,
            policyRuleId: responseJson.policy_rule_id || responseJson.policyRuleId || null,
            reason: responseJson.reason,
            latencyMs: Date.now() - start
        };
    } catch (e) {
        console.error("Compliance Check Error:", e);
        return {
            status: "NEEDS_REVIEW",
            policyRuleId: "ERR_CLASSIFIER_FAILED",
            reason: "LLM Classification failed, flagging for review.",
            latencyMs: Date.now() - start
        };
    }
}
