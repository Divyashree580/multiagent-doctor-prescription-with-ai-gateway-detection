import { NextResponse } from "next/server";
import { supervisorAgent } from "@/deep-agent/supervisiorAgent";
import { HumanMessage } from "@langchain/core/messages";
import { checkRequestCompliance, checkResponseCompliance } from "@/lib/compliance/classifier";
import { logAgentCall } from "@/lib/compliance/auditLogger";
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
        const result = await supervisorAgent.invoke({
            messages: [new HumanMessage(prompt)]
        });

        // Extract the final message from the agent
        const messages = result.messages || [];
        const finalMessage = messages[messages.length - 1];
        
        const contentRaw = finalMessage?.content || "No output generated";
        const output = typeof contentRaw === "string" ? contentRaw : JSON.stringify(contentRaw);

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
            const fallbackResponse = "Based on the symptoms you've described, I can provide some general context, but I'm unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need.";
            return NextResponse.json({ status: true, message: fallbackResponse });
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