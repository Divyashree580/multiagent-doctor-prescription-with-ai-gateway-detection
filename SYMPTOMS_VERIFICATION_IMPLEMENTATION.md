# Symptoms Verification Implementation Examples

## Example 1: Updated Chat API with Symptoms Verification

```typescript
// app/api/getchat/route.ts
import { MedicalSafetyDetector } from "@/lib/compliance/medicalSafetyDetector";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const {
      userId,
      prompt,
      patientName,
      patientAge,
      patientGender,
      medicalCondition,
      symptoms = [],
    } = await request.json();

    // Validate required fields
    if (!userId || !prompt) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // ===== SYMPTOM VERIFICATION STAGE =====
    // Analyze request with full symptom verification
    const safetyAnalysis = MedicalSafetyDetector.analyzeRequestWithContext(
      prompt,
      patientGender,
      medicalCondition,
      patientAge,
      symptoms.length > 0 ? symptoms : undefined,
    );

    // Check if request violates compliance rules
    if (safetyAnalysis.riskLevel === "CRITICAL") {
      return NextResponse.json(
        {
          success: false,
          error: "COMPLIANCE_VIOLATION",
          message: "Request violates medical safety compliance",
          violations: safetyAnalysis.violations,
          riskLevel: safetyAnalysis.riskLevel,
          symptoms: safetyAnalysis.symptomVerification,
        },
        { status: 403 },
      );
    }

    // Log compliance check results
    console.log("Safety Analysis:", {
      riskLevel: safetyAnalysis.riskLevel,
      violations: safetyAnalysis.violations,
      symptomVerification: safetyAnalysis.symptomVerification,
    });

    // ===== CREATE CHAT RECORD =====
    // Create chat record with symptom information
    const chat = await prisma.chat.create({
      data: {
        userId,
        patientName,
        patientAge,
        patientGender,
        medicalCondition: medicalCondition || null,
        symptoms: symptoms.length > 0 ? symptoms : [],
        chats: [
          {
            role: "user",
            content: prompt,
            complianceStatus: safetyAnalysis.riskLevel,
            symptomVerification: safetyAnalysis.symptomVerification,
          },
        ],
      },
    });

    // ===== PROCESS REQUEST =====
    // Your chat processing logic here
    const aiResponse = await processWithAI(
      prompt,
      patientName,
      medicalCondition,
    );

    // ===== ANALYZE RESPONSE =====
    // Analyze AI response for compliance
    const responseAnalysis = MedicalSafetyDetector.analyzeResponseWithContext(
      aiResponse,
      patientGender,
      medicalCondition,
      patientAge,
    );

    if (responseAnalysis.riskLevel === "CRITICAL") {
      // Log critical response violation
      console.warn("CRITICAL RESPONSE VIOLATION:", responseAnalysis.violations);

      // Update chat with warning
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          chats: [
            ...(chat.chats as any[]),
            {
              role: "assistant",
              content: aiResponse,
              complianceStatus: "VIOLATION",
              warnings: responseAnalysis.violations,
            },
          ],
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "RESPONSE_COMPLIANCE_VIOLATION",
          message: "AI response contains medical safety violations",
          violations: responseAnalysis.violations,
        },
        { status: 403 },
      );
    }

    // ===== SAVE SUCCESSFUL RESPONSE =====
    // Update chat with successful response
    const updatedChat = await prisma.chat.update({
      where: { id: chat.id },
      data: {
        chats: [
          ...(chat.chats as any[]),
          {
            role: "assistant",
            content: aiResponse,
            complianceStatus: responseAnalysis.riskLevel,
            symptomVerification: responseAnalysis.symptomVerification,
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: aiResponse,
      chatId: updatedChat.id,
      complianceStatus: {
        requestAnalysis: safetyAnalysis,
        responseAnalysis: responseAnalysis,
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function processWithAI(
  prompt: string,
  patientName: string,
  condition?: string,
) {
  // Your AI processing logic
  return "AI response here";
}
```

## Example 2: Medicine Recommendation API with Symptoms Verification

```typescript
// app/api/medicine-recommendation/route.ts
import { MedicalSafetyDetector } from "@/lib/compliance/medicalSafetyDetector";
import { medicineAgent } from "@/app/substitute-medicine/medicine";
import { HumanMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const {
      prompt,
      patientGender,
      medicalCondition,
      patientAge,
      symptoms = [],
    } = await request.json();

    // ===== VALIDATE SYMPTOMS FIRST =====
    if (symptoms.length > 0 && medicalCondition) {
      const symptomValidation = MedicalSafetyDetector.verifySymptoms(
        symptoms,
        patientGender,
        medicalCondition,
        patientAge,
      );

      // Check if symptoms are valid for the condition
      if (!symptomValidation.isVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_SYMPTOM_PROFILE",
            message:
              "Reported symptoms do not match the medical condition or patient profile",
            validation: symptomValidation,
            recommendations: symptomValidation.notes,
          },
          { status: 400 },
        );
      }

      console.log("Symptoms validated successfully:", symptomValidation);
    }

    // ===== ANALYZE REQUEST FOR SAFETY =====
    const safetyAnalysis = MedicalSafetyDetector.analyzeRequestWithContext(
      prompt,
      patientGender,
      medicalCondition,
      patientAge,
      symptoms,
    );

    if (safetyAnalysis.riskLevel === "CRITICAL") {
      return NextResponse.json(
        {
          success: false,
          error: "SAFETY_VIOLATION",
          message: "Medicine recommendation request violates safety compliance",
          violations: safetyAnalysis.violations,
        },
        { status: 403 },
      );
    }

    // ===== GET MEDICINE RECOMMENDATIONS =====
    const result = await medicineAgent.invoke({
      messages: [new HumanMessage(prompt)],
    });

    const messages = result.messages || [];
    const finalMessage = messages[messages.length - 1];
    const output = finalMessage?.content || "No recommendations generated";

    // ===== VERIFY RECOMMENDATIONS =====
    const recommendationAnalysis =
      MedicalSafetyDetector.analyzeResponseWithContext(
        output as string,
        patientGender,
        medicalCondition,
        patientAge,
        symptoms,
      );

    if (recommendationAnalysis.riskLevel === "CRITICAL") {
      console.warn("CRITICAL: Unsafe recommendation generated");
      return NextResponse.json(
        {
          success: false,
          error: "UNSAFE_RECOMMENDATION",
          message: "Generated recommendations contain safety violations",
          violations: recommendationAnalysis.violations,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: output,
      complianceVerification: {
        requestValid: safetyAnalysis.riskLevel !== "CRITICAL",
        recommendationValid: recommendationAnalysis.riskLevel !== "CRITICAL",
        symptomValidation:
          symptoms.length > 0
            ? MedicalSafetyDetector.verifySymptoms(
                symptoms,
                patientGender,
                medicalCondition,
                patientAge,
              )
            : undefined,
      },
    });
  } catch (error) {
    console.error("Error in medicine recommendation:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      },
      { status: 500 },
    );
  }
}
```

## Example 3: Dashboard Component with Symptom Verification

```typescript
// components/patient-symptoms.tsx
'use client';

import { useState } from 'react';
import { MedicalSafetyDetector } from '@/lib/compliance/medicalSafetyDetector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PatientSymptomsProps {
  patientGender?: string;
  medicalCondition?: string;
  patientAge?: number;
}

export function PatientSymptoms({
  patientGender,
  medicalCondition,
  patientAge
}: PatientSymptomsProps) {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerifySymptoms = async () => {
    setLoading(true);
    try {
      const result = MedicalSafetyDetector.verifySymptoms(
        symptoms,
        patientGender,
        medicalCondition,
        patientAge
      );
      setVerification(result);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSymptom = (symptom: string) => {
    if (!symptoms.includes(symptom)) {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Symptom Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Patient Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold">Gender:</span>
              <p>{patientGender || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-semibold">Condition:</span>
              <p>{medicalCondition || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-semibold">Age:</span>
              <p>{patientAge || 'Not specified'}</p>
            </div>
          </div>

          {/* Symptoms Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reported Symptoms
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {symptoms.map(symptom => (
                <Badge key={symptom} variant="secondary" className="cursor-pointer">
                  {symptom}
                  <button
                    onClick={() => handleRemoveSymptom(symptom)}
                    className="ml-1 text-xs"
                  >
                    ✕
                  </button>
                </Badge>
              ))}
            </div>

            <input
              type="text"
              placeholder="Enter symptom and press Add"
              className="w-full px-3 py-2 border rounded-md"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) {
                    handleAddSymptom(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerifySymptoms}
            disabled={symptoms.length === 0 || loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
          >
            {loading ? 'Verifying...' : 'Verify Symptoms'}
          </button>

          {/* Verification Results */}
          {verification && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Overall Status:</span>
                <Badge
                  variant={
                    (verification as any).isVerified ? 'default' : 'destructive'
                  }
                >
                  {(verification as any).isVerified ? 'VERIFIED' : 'FLAGGED'}
                </Badge>
              </div>

              {/* Gender Compatibility */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Gender Compatible:</span>
                  <Badge
                    variant={
                      (verification as any).genderCompatible
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {(verification as any).genderCompatible ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>

              {/* Condition Compatibility */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Condition Compatible:
                  </span>
                  <Badge
                    variant={
                      (verification as any).conditionCompatible
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {(verification as any).conditionCompatible ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>

              {/* Flagged Symptoms */}
              {(verification as any).flaggedSymptoms.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-red-600">
                    Flagged Symptoms:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(verification as any).flaggedSymptoms.map(
                      (sym: string) => (
                        <Badge key={sym} variant="outline" className="text-red-600">
                          {sym}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(verification as any).notes.length > 0 && (
                <div className="border-t pt-3">
                  <span className="text-sm font-medium block mb-2">Notes:</span>
                  <ul className="text-sm space-y-1">
                    {(verification as any).notes.map((note: string, idx: number) => (
                      <li key={idx} className="text-gray-600">
                        • {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Example 4: Test Suite for Symptoms Verification

```typescript
// lib/compliance/medicalSafetyDetector.test.ts
import { MedicalSafetyDetector } from "./medicalSafetyDetector";

describe("Symptoms Verification", () => {
  describe("Gender-based verification", () => {
    test("should flag female symptoms for male patients", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["menstruation", "vaginal bleeding"],
        "male",
      );

      expect(result.isVerified).toBe(false);
      expect(result.genderCompatible).toBe(false);
      expect(result.flaggedSymptoms.length).toBeGreaterThan(0);
    });

    test("should flag male symptoms for female patients", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["prostate pain", "erectile dysfunction"],
        "female",
      );

      expect(result.isVerified).toBe(false);
      expect(result.genderCompatible).toBe(false);
    });

    test("should accept gender-appropriate symptoms", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["breast pain", "menstrual cramps"],
        "female",
      );

      expect(result.genderCompatible).toBe(true);
    });
  });

  describe("Condition-based verification", () => {
    test("should validate asthma symptoms", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["wheezing", "shortness of breath"],
        "female",
        "asthma",
      );

      expect(result.conditionCompatible).toBe(true);
      expect(result.isVerified).toBe(true);
    });

    test("should flag mismatched condition symptoms", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["polyuria", "polydipsia"],
        "female",
        "asthma",
      );

      expect(result.conditionCompatible).toBe(false);
    });
  });

  describe("Age-based verification", () => {
    test("should recognize child symptoms", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["ear infection"],
        "male",
        undefined,
        8,
      );

      expect(result.notes.some((n) => n.includes("child"))).toBe(true);
    });

    test("should recognize elderly symptoms", () => {
      const result = MedicalSafetyDetector.verifySymptoms(
        ["arthritis", "memory loss"],
        "female",
        undefined,
        75,
      );

      expect(result.notes.some((n) => n.includes("elderly"))).toBe(true);
    });
  });

  describe("Request analysis with context", () => {
    test("should analyze request with full context", () => {
      const analysis = MedicalSafetyDetector.analyzeRequestWithContext(
        "I am experiencing fever and cough",
        "female",
        "asthma",
        30,
        ["fever", "cough"],
      );

      expect(analysis.symptomVerification).toBeDefined();
      expect(analysis.symptomVerification?.isVerified).toBe(true);
    });
  });
});
```

## QA Checklist

- [ ] Database migration completed
- [ ] Chat model updated with symptoms fields
- [ ] API routes updated with verification logic
- [ ] Symptom extraction working correctly
- [ ] Gender-based rules functioning
- [ ] Condition-specific rules validated
- [ ] Age group matching implemented
- [ ] API response handling symptoms flagging
- [ ] Compliance logging implemented
- [ ] Tests passing for all scenarios
- [ ] Documentation review complete
- [ ] Stakeholder approval obtained
