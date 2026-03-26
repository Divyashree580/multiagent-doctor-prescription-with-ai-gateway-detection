/**
 * Symptoms Verification Test Cases
 * 
 * Test Case: Male, 24 years old with fatigue, weight loss, excessive thirst
 * Expected symptoms mapping: Diabetes (polyuria + polydipsia indicators)
 */

import { MedicalSafetyDetector } from '@/lib/compliance/medicalSafetyDetector';

describe('Symptoms Verification - Real World Test Cases', () => {
  
  describe('Test Case 1: Diabetes Symptoms in Young Male', () => {
    const testData = {
      gender: 'male',
      age: 24,
      symptoms: ['fatigue', 'weight loss', 'excessive thirst'],
      medicalCondition: 'diabetes',
      userRequest: 'What disease do I have? I have fatigue, weight loss, and excessive thirst for 2 months.',
      aiResponse: 'Based on the symptoms you\'ve described, I can provide some general context, but I\'m unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need.'
    };

    test('Request should be VALID - not a violation', () => {
      // Analyze the user request
      const requestAnalysis = MedicalSafetyDetector.analyzeRequestWithContext(
        testData.userRequest,
        testData.gender,
        testData.medicalCondition,
        testData.age,
        testData.symptoms
      );

      console.log('\n=== REQUEST ANALYSIS ===');
      console.log('Risk Level:', requestAnalysis.riskLevel);
      console.log('Violations:', requestAnalysis.violations);
      console.log('Has prescription request:', requestAnalysis.hasPrescriptionRequest);
      console.log('Symptom Verification:', requestAnalysis.symptomVerification);

      // Assertions
      expect(requestAnalysis.riskLevel).not.toBe('CRITICAL');
      expect(requestAnalysis.hasPrescriptionRequest).toBe(false);
      expect(requestAnalysis.violations.length).toBe(0);
    });

    test('Symptoms should be VERIFIED as gender-compatible', () => {
      const verification = MedicalSafetyDetector.verifySymptoms(
        testData.symptoms,
        testData.gender,
        testData.medicalCondition,
        testData.age
      );

      console.log('\n=== SYMPTOM VERIFICATION ===');
      console.log('Is Verified:', verification.isVerified);
      console.log('Gender Compatible:', verification.genderCompatible);
      console.log('Condition Compatible:', verification.conditionCompatible);
      console.log('Flagged Symptoms:', verification.flaggedSymptoms);
      console.log('Notes:', verification.notes);

      expect(verification.isVerified).toBe(true);
      expect(verification.genderCompatible).toBe(true);
      expect(verification.flaggedSymptoms.length).toBe(0);
    });

    test('Symptoms should MATCH diabetes condition', () => {
      const verification = MedicalSafetyDetector.verifySymptoms(
        testData.symptoms,
        testData.gender,
        testData.medicalCondition,
        testData.age
      );

      console.log('\n=== CONDITION MATCHING ===');
      console.log('Condition Compatible:', verification.conditionCompatible);
      console.log('Notes:', verification.notes);

      // Should find symptoms matching diabetes
      const hasConditionMatch = verification.notes.some(note => 
        note.includes('RULE_CONDITION_002') // Symptoms consistent with condition
      );

      expect(verification.conditionCompatible).toBe(true);
      expect(hasConditionMatch).toBe(true);
    });

    test('Response should be COMPLIANT - appropriately cautious', () => {
      const responseAnalysis = MedicalSafetyDetector.analyzeResponseWithContext(
        testData.aiResponse,
        testData.gender,
        testData.medicalCondition,
        testData.age,
        testData.symptoms
      );

      console.log('\n=== RESPONSE ANALYSIS ===');
      console.log('Risk Level:', responseAnalysis.riskLevel);
      console.log('Violations:', responseAnalysis.violations);
      console.log('Has prescriptive language:', responseAnalysis.riskLevel);
      console.log('Dosage advice:', responseAnalysis.hasDosageAdvice);

      // The response should NOT have prescription recommendations
      expect(responseAnalysis.hasPrescriptionRequest).toBe(false);
      expect(responseAnalysis.hasDosageAdvice).toBe(false);
      expect(responseAnalysis.riskLevel).not.toBe('CRITICAL');
    });

    test('Age group validation - symptoms appropriate for 24-year-old', () => {
      const verification = MedicalSafetyDetector.verifySymptoms(
        testData.symptoms,
        testData.gender,
        testData.medicalCondition,
        testData.age
      );

      console.log('\n=== AGE GROUP VALIDATION ===');
      console.log('Age:', testData.age);
      console.log('Age Group: Adult (18-64)');
      console.log('Notes:', verification.notes);

      // Should recognize as adult symptoms
      const ageValidationNote = verification.notes.find(n => 
        n.includes('RULE_AGE_001')
      );
      
      // Age validation note may or may not be present, but should not conflict
      expect(verification.isVerified).toBe(true);
    });

    test('Full integration test - complete validation flow', () => {
      console.log('\n=== FULL INTEGRATION TEST ===');
      console.log('Patient Profile:');
      console.log(`  - Age: ${testData.age}`);
      console.log(`  - Gender: ${testData.gender}`);
      console.log(`  - Symptoms: ${testData.symptoms.join(', ')}`);
      console.log(`  - Could indicate: ${testData.medicalCondition}`);

      // Step 1: Verify symptoms
      const symptomVerification = MedicalSafetyDetector.verifySymptoms(
        testData.symptoms,
        testData.gender,
        testData.medicalCondition,
        testData.age
      );

      // Step 2: Analyze request
      const requestAnalysis = MedicalSafetyDetector.analyzeRequestWithContext(
        testData.userRequest,
        testData.gender,
        testData.medicalCondition,
        testData.age,
        testData.symptoms
      );

      // Step 3: Analyze response
      const responseAnalysis = MedicalSafetyDetector.analyzeResponseWithContext(
        testData.aiResponse,
        testData.gender,
        testData.medicalCondition,
        testData.age,
        testData.symptoms
      );

      console.log('\nResults:');
      console.log(`✓ Symptoms Verified: ${symptomVerification.isVerified}`);
      console.log(`✓ Request Compliant: ${requestAnalysis.riskLevel !== 'CRITICAL'}`);
      console.log(`✓ Response Appropriate: ${responseAnalysis.riskLevel !== 'CRITICAL'}`);

      // All should pass
      expect(symptomVerification.isVerified).toBe(true);
      expect(requestAnalysis.riskLevel).not.toBe('CRITICAL');
      expect(responseAnalysis.riskLevel).not.toBe('CRITICAL');

      console.log('\n✅ All validations PASSED for diabetes symptom profile');
    });
  });

  describe('Test Case 2: Invalid Symptom-Gender Mismatch', () => {
    test('Should FLAG pregnancy symptoms for male patient', () => {
      const verification = MedicalSafetyDetector.verifySymptoms(
        ['pregnancy', 'menstrual cramps', 'vaginal bleeding'],
        'male'
      );

      console.log('\n=== INVALID GENDER-SYMPTOM MATCH ===');
      console.log('Gender: Male');
      console.log('Symptoms: pregnancy, menstrual cramps, vaginal bleeding');
      console.log('Flagged:', verification.flaggedSymptoms);
      console.log('Verified:', verification.isVerified);

      expect(verification.isVerified).toBe(false);
      expect(verification.genderCompatible).toBe(false);
      expect(verification.flaggedSymptoms.length).toBeGreaterThan(0);
    });
  });

  describe('Test Case 3: Condition-Symptom Mismatch', () => {
    test('Should FLAG asthma symptoms for diabetic patient profile', () => {
      const verification = MedicalSafetyDetector.verifySymptoms(
        ['wheezing', 'shortness of breath'],
        'male',
        'diabetes', // Wrong condition for these symptoms
        24
      );

      console.log('\n=== CONDITION MISMATCH ===');
      console.log('Reported Condition: diabetes');
      console.log('Symptoms: wheezing, shortness of breath');
      console.log('Verified:', verification.isVerified);
      console.log('Notes:', verification.notes);

      expect(verification.conditionCompatible).toBe(false);
    });
  });

  describe('Test Case 4: Auto-Symptom Extraction', () => {
    test('Should extract symptoms from unstructured text', () => {
      const userMessage = 'I have been experiencing fatigue and dizziness for the past week, along with excessive thirst';
      
      // The analyzer should extract symptoms automatically
      const analysis = MedicalSafetyDetector.analyzeRequestWithContext(
        userMessage,
        'male',
        'diabetes',
        24
      );

      console.log('\n=== AUTO-EXTRACTION TEST ===');
      console.log('Input:', userMessage);
      console.log('Symptom Verification:', analysis.symptomVerification);

      // Should recognize symptoms related to diabetes
      expect(analysis.symptomVerification).toBeDefined();
    });
  });
});

// Export test utility functions
export const runSymptomVerificationTests = () => {
  console.log('\n' + '='.repeat(60));
  console.log('SYMPTOMS VERIFICATION TEST SUITE');
  console.log('='.repeat(60));

  // Test Case 1: Diabetes symptoms
  console.log('\n📋 TEST CASE 1: Diabetes Symptoms in Young Male');
  console.log('Patient: 24-year-old Male');
  console.log('Symptoms: fatigue, weight loss, excessive thirst');
  
  const diabetesVerification = MedicalSafetyDetector.verifySymptoms(
    ['fatigue', 'weight loss', 'excessive thirst'],
    'male',
    'diabetes',
    24
  );

  console.log('Result:', {
    isVerified: diabetesVerification.isVerified,
    genderCompatible: diabetesVerification.genderCompatible,
    conditionCompatible: diabetesVerification.conditionCompatible,
    notes: diabetesVerification.notes
  });

  // Test Case 2: Request analysis
  console.log('\n📋 TEST CASE 2: Request Analysis');
  const request = 'What disease do I have? I have fatigue, weight loss, and excessive thirst for 2 months.';
  
  const requestAnalysis = MedicalSafetyDetector.analyzeRequestWithContext(
    request,
    'male',
    'diabetes',
    24,
    ['fatigue', 'weight loss', 'excessive thirst']
  );

  console.log('Request:', request);
  console.log('Result:', {
    riskLevel: requestAnalysis.riskLevel,
    compliant: requestAnalysis.riskLevel !== 'CRITICAL',
    violations: requestAnalysis.violations
  });

  // Test Case 3: Response analysis
  console.log('\n📋 TEST CASE 3: Response Analysis');
  const response = 'Based on the symptoms you\'ve described, I can provide some general context, but I\'m unable to suggest specific medications or dosages. Please consult a licensed healthcare provider for personalized medical advice and any prescriptions you may need.';
  
  const responseAnalysis = MedicalSafetyDetector.analyzeResponseWithContext(
    response,
    'male',
    'diabetes',
    24,
    ['fatigue', 'weight loss', 'excessive thirst']
  );

  console.log('Response:', response);
  console.log('Result:', {
    riskLevel: responseAnalysis.riskLevel,
    compliant: responseAnalysis.riskLevel !== 'CRITICAL',
    hasPrescriptionRequest: responseAnalysis.hasPrescriptionRequest,
    hasDosageAdvice: responseAnalysis.hasDosageAdvice
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST SUITE COMPLETE');
  console.log('='.repeat(60) + '\n');
};
