/**
 * Symptoms Verification Validation Endpoint
 * 
 * Used to test and validate the symptoms verification system in real-time
 * Path: /api/debug/validate-symptoms
 * 
 * Test Case: Male, 24 years old with diabetes symptoms
 * Request: "What disease do I have? I have fatigue, weight loss, and excessive thirst for 2 months."
 * Response: Appropriately cautious response without prescriptions
 */

import { MedicalSafetyDetector } from '@/lib/compliance/medicalSafetyDetector';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const {
      patientGender,
      patientAge,
      symptoms,
      medicalCondition,
      userRequest,
      aiResponse
    } = await request.json();

    // Validate input
    if (!patientGender || !patientAge || !symptoms || !userRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: patientGender, patientAge, symptoms, userRequest'
        },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(70));
    console.log('SYMPTOMS VERIFICATION VALIDATION');
    console.log('='.repeat(70));
    console.log('\nPatient Profile:');
    console.log(`  Age: ${patientAge}`);
    console.log(`  Gender: ${patientGender}`);
    console.log(`  Medical Condition: ${medicalCondition || 'Not specified'}`);
    console.log(`  Symptoms: ${symptoms.join(', ')}`);

    // ===== STEP 1: VERIFY SYMPTOMS =====
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 1: SYMPTOM VERIFICATION');
    console.log('-'.repeat(70));

    const symptomVerification = MedicalSafetyDetector.verifySymptoms(
      symptoms,
      patientGender,
      medicalCondition,
      patientAge
    );

    console.log('Symptom Verification Result:');
    console.log(`  ✓ Is Verified: ${symptomVerification.isVerified}`);
    console.log(`  ✓ Gender Compatible: ${symptomVerification.genderCompatible}`);
    console.log(`  ✓ Condition Compatible: ${symptomVerification.conditionCompatible}`);
    console.log(`  ✓ Flagged Symptoms: ${symptomVerification.flaggedSymptoms.length > 0 ? symptomVerification.flaggedSymptoms.join(', ') : 'None'}`);
    console.log(`  ✓ Notes: ${symptomVerification.notes.join(' | ')}`);

    // ===== STEP 2: ANALYZE REQUEST =====
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 2: REQUEST ANALYSIS');
    console.log('-'.repeat(70));

    const requestAnalysis = MedicalSafetyDetector.analyzeRequestWithContext(
      userRequest,
      patientGender,
      medicalCondition,
      patientAge,
      symptoms
    );

    console.log('Request Analysis Result:');
    console.log(`  User Request: "${userRequest}"`);
    console.log(`  Risk Level: ${requestAnalysis.riskLevel}`);
    console.log(`  Is Compliant: ${requestAnalysis.riskLevel !== 'CRITICAL' ? '✅ YES' : '❌ NO'}`);
    console.log(`  Has Prescription Request: ${requestAnalysis.hasPrescriptionRequest}`);
    console.log(`  Has Controlled Substances: ${requestAnalysis.hasControlledSubstance}`);
    console.log(`  Violations: ${requestAnalysis.violations.length > 0 ? requestAnalysis.violations.join(', ') : 'None'}`);

    // ===== STEP 3: ANALYZE RESPONSE (if provided) =====
    let responseAnalysis = null;
    if (aiResponse) {
      console.log('\n' + '-'.repeat(70));
      console.log('STEP 3: RESPONSE ANALYSIS');
      console.log('-'.repeat(70));

      responseAnalysis = MedicalSafetyDetector.analyzeResponseWithContext(
        aiResponse,
        patientGender,
        medicalCondition,
        patientAge,
        symptoms
      );

      console.log('Response Analysis Result:');
      console.log(`  AI Response: "${aiResponse}"`);
      console.log(`  Risk Level: ${responseAnalysis.riskLevel}`);
      console.log(`  Is Compliant: ${responseAnalysis.riskLevel !== 'CRITICAL' ? '✅ YES' : '❌ NO'}`);
      console.log(`  Has Prescriptive Language: ${responseAnalysis.riskLevel === 'CRITICAL'}`);
      console.log(`  Has Dosage Advice: ${responseAnalysis.hasDosageAdvice}`);
      console.log(`  Has Treatment Recommendation: ${responseAnalysis.violations.some(v => v.includes('RULE_105'))}`);
      console.log(`  Violations: ${responseAnalysis.violations.length > 0 ? responseAnalysis.violations.join(', ') : 'None'}`);
    }

    // ===== FINAL VERDICT =====
    console.log('\n' + '='.repeat(70));
    console.log('FINAL VALIDATION VERDICT');
    console.log('='.repeat(70));

    const isAllValid = 
      symptomVerification.isVerified &&
      requestAnalysis.riskLevel !== 'CRITICAL' &&
      (!responseAnalysis || responseAnalysis.riskLevel !== 'CRITICAL');

    console.log(`\n✅ OVERALL STATUS: ${isAllValid ? 'VALID & COMPLIANT' : 'INVALID OR NON-COMPLIANT'}`);

    if (isAllValid) {
      console.log('\n📋 Summary:');
      console.log('  • Symptoms are valid for patient profile');
      console.log('  • Request does not violate compliance rules');
      console.log(aiResponse ? '  • Response is appropriately cautious' : '  • No response validation needed');
      console.log('  • Patient can proceed with consultation');
    } else {
      console.log('\n⚠️  Issues Found:');
      if (!symptomVerification.isVerified) {
        console.log(`  • Symptoms: ${symptomVerification.notes.join(', ')}`);
      }
      if (requestAnalysis.riskLevel === 'CRITICAL') {
        console.log(`  • Request: ${requestAnalysis.violations.join(', ')}`);
      }
      if (responseAnalysis && responseAnalysis.riskLevel === 'CRITICAL') {
        console.log(`  • Response: ${responseAnalysis.violations.join(', ')}`);
      }
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Return comprehensive validation result
    return NextResponse.json({
      success: true,
      isValid: isAllValid,
      validation: {
        symptoms: {
          isVerified: symptomVerification.isVerified,
          genderCompatible: symptomVerification.genderCompatible,
          conditionCompatible: symptomVerification.conditionCompatible,
          flaggedSymptoms: symptomVerification.flaggedSymptoms,
          notes: symptomVerification.notes
        },
        request: {
          riskLevel: requestAnalysis.riskLevel,
          isCompliant: requestAnalysis.riskLevel !== 'CRITICAL',
          hasPrescriptionRequest: requestAnalysis.hasPrescriptionRequest,
          violations: requestAnalysis.violations,
          detectedDrugs: requestAnalysis.detectedDrugs,
          detectedDosages: requestAnalysis.detectedDosages
        },
        response: responseAnalysis ? {
          riskLevel: responseAnalysis.riskLevel,
          isCompliant: responseAnalysis.riskLevel !== 'CRITICAL',
          hasDosageAdvice: responseAnalysis.hasDosageAdvice,
          violations: responseAnalysis.violations,
          detectedDrugs: responseAnalysis.detectedDrugs,
          detectedDosages: responseAnalysis.detectedDosages
        } : null
      },
      verdict: {
        overall: isAllValid ? 'VALID & COMPLIANT' : 'INVALID OR NON-COMPLIANT',
        expectation: {
          requestShouldPass: 'YES - Query is legitimate symptom inquiry',
          responseShouldBeCautious: 'YES - Should not prescribe or suggest medications',
          patientCanProceed: isAllValid ? 'YES - Validated and safe to proceed' : 'NO - Requires review'
        }
      }
    });

  } catch (error) {
    console.error('Error in symptoms validation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Internal validation error'
      },
      { status: 500 }
    );
  }
}

// Example test case
export const EXAMPLE_TEST_CASE = {
  patientGender: 'male',
  patientAge: 24,
  symptoms: ['fatigue', 'weight loss', 'excessive thirst'],
  medicalCondition: 'diabetes',
  userRequest: 'What disease do I have? I have fatigue, weight loss, and excessive thirst for 2 months.',
  aiResponse: 'Based on the symptoms you\'ve described, I can provide some general context, but I\'m unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need.'
};

// cURL command to test:
// curl -X POST http://localhost:3000/api/debug/validate-symptoms \
//   -H "Content-Type: application/json" \
//   -d '{
//     "patientGender": "male",
//     "patientAge": 24,
//     "symptoms": ["fatigue", "weight loss", "excessive thirst"],
//     "medicalCondition": "diabetes",
//     "userRequest": "What disease do I have? I have fatigue, weight loss, and excessive thirst for 2 months.",
//     "aiResponse": "Based on the symptoms you'\''ve described, I can provide some general context, but I'\''m unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need."
//   }'
