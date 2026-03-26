import { NextResponse } from "next/server";
import { supervisorAgent } from "@/deep-agent/supervisiorAgent";
import { HumanMessage } from "@langchain/core/messages";
import { checkRequestCompliance, checkResponseCompliance } from "@/lib/compliance/classifier";
import { logAgentCall } from "@/lib/compliance/auditLogger";
import { MedicalSafetyDetector } from "@/lib/compliance/medicalSafetyDetector";
import crypto from 'crypto';


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt } = body;
        
        // Generate correlation IDs for audit tracking
        const sessionId = body.sessionId || crypto.randomUUID(); 
        const traceId = crypto.randomUUID();

        // 1. Intercept and classify user request
        const reqCompliance = await checkRequestCompliance(prompt);
        
        // Log request compliance
        logAgentCall({
            sessionId,
            traceId,
            agentType: "SUPERVISOR",
            modelId: "qwen/qwen3-32b",
            callDirection: "REQUEST",
            complianceStatus: reqCompliance.status,
            violationType: reqCompliance.status === "VIOLATION" ? reqCompliance.policyRuleId || "UNKNOWN" : undefined,
            policyRuleId: reqCompliance.policyRuleId || undefined,
            rawContent: prompt,
            contentSummary: reqCompliance.reason,
            latencyMs: reqCompliance.latencyMs || 0,
            blocked: reqCompliance.status === "VIOLATION"
        });

        if (reqCompliance.status === "VIOLATION") {
            const fallbackMessage = "We're sorry, but this request falls outside the scope of what Doctor Assistant can help with. This platform provides symptom analysis and general health information only. For medical prescriptions or treatment, please consult a licensed healthcare professional.";
            // Returning 200 with status: false is technically a business logic convention
            return NextResponse.json({ status: false, message: fallbackMessage });
        }
        
        // --- Core Agent Invocation ---
        let output = "";
        try {
            const result = await supervisorAgent.invoke(
                { messages: [new HumanMessage(prompt)] },
                { recursionLimit: 25 }
            );

            // Extract the final message from the agent
            const messages = result.messages || [];
            const finalMessage = messages[messages.length - 1];
            
            const contentRaw = finalMessage?.content || "No output generated";
            output = typeof contentRaw === "string" ? contentRaw : JSON.stringify(contentRaw);
        } catch (agentError) {
            console.error("Agent invocation error:", agentError);
            throw new Error(`Agent failed: ${agentError instanceof Error ? agentError.message : "Unknown error"}`);
        }

        // 2. Intercept and classify agent response
        const resCompliance = await checkResponseCompliance(output);

        logAgentCall({
            sessionId,
            traceId,
            agentType: "SUPERVISOR",
            modelId: "qwen/qwen3-32b",
            callDirection: "RESPONSE",
            complianceStatus: resCompliance.status,
            violationType: resCompliance.status === "VIOLATION" ? resCompliance.policyRuleId || "UNKNOWN" : undefined,
            policyRuleId: resCompliance.policyRuleId || undefined,
            rawContent: output,
            contentSummary: resCompliance.reason,
            latencyMs: resCompliance.latencyMs || 0,
            blocked: resCompliance.status === "VIOLATION"
        });

        if (resCompliance.status === "VIOLATION") {
            // Option A: Redact the specific medications and dosages from the AI's response instead of blocking entirely
            const redactedOutput = MedicalSafetyDetector.redactMedicalInfo(output);
            
            // Returns the original answer with drugs and dosages replaced by *****
            return NextResponse.json({ status: true, message: redactedOutput });
        }


        return NextResponse.json({ 
            status: true, 
            message: output
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { 
                status: false, 
                message: error instanceof Error ? error.message : "An error occurred"
            },
            { status: 500 }
        );
    }
}
