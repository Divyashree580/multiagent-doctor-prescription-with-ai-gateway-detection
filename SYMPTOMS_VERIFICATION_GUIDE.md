# Symptoms Verification System Guide

## Overview

The Symptoms Verification system provides gender-aware and condition-specific validation for patient symptoms. It ensures that reported symptoms are compatible with the patient's gender, medical condition, and age group.

## Database Schema Updates

### Updated Chat Model

The `Chat` model in Prisma now includes:

```prisma
model Chat {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  chats           Json[]
  patientName    String
  patientAge     Int?
  patientGender  String?
  medicalCondition String?  // NEW: Store patient's primary medical condition(s)
  symptoms        String[]  // NEW: Array of reported symptoms
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Migration

Run the migration to update your database:

```bash
npx prisma migrate dev --name add_symptoms_verification
```

## Key Features

### 1. Gender-Based Symptom Validation

**Female-Only Symptoms:**

- Menstruation, menstrual, vaginal symptoms
- Pregnancy-related symptoms
- Breast pain, mastitis
- Gynecological conditions
- PCOS, endometriosis, fibroids

Validation Rule: `RULE_GENDER_001`

- Flags if female-specific symptoms appear in male patient records

**Male-Only Symptoms:**

- Prostate, testicular conditions
- Erectile dysfunction
- Benign prostatic hyperplasia (BPH)
- Penile conditions

Validation Rule: `RULE_GENDER_002`

- Flags if male-specific symptoms appear in female patient records

### 2. Condition-Specific Symptom Validation

Supported medical conditions with mapped symptoms:

| Condition     | Key Symptoms                                              | Rule               |
| ------------- | --------------------------------------------------------- | ------------------ |
| Diabetes      | Polyuria, polydipsia, fatigue, blurred vision, neuropathy | RULE_CONDITION_001 |
| Hypertension  | High BP, headache, dizziness, chest pain                  | RULE_CONDITION_001 |
| Asthma        | Wheezing, shortness of breath, chest tightness, cough     | RULE_CONDITION_001 |
| Heart Disease | Chest pain, palpitations, dyspnea, edema                  | RULE_CONDITION_001 |
| COPD          | Chronic cough, wheezing, dyspnea                          | RULE_CONDITION_001 |
| Arthritis     | Joint pain, swelling, stiffness                           | RULE_CONDITION_001 |
| Thyroid       | Fatigue, weight change, goiter                            | RULE_CONDITION_001 |
| Depression    | Sadness, hopelessness, sleep issues, anhedonia            | RULE_CONDITION_001 |
| Anxiety       | Worry, panic attacks, tremor, palpitations                | RULE_CONDITION_001 |
| Migraine      | Headache, photophobia, nausea, aura                       | RULE_CONDITION_001 |
| Gastric       | Abdominal pain, nausea, acid reflux                       | RULE_CONDITION_001 |
| UTI           | Dysuria, urinary frequency, hematuria                     | RULE_CONDITION_001 |
| Infection     | Fever, chills, malaise, elevated temperature              | RULE_CONDITION_001 |

**Validation Rule: `RULE_CONDITION_002`**

- Validates that reported symptoms match the medical condition
- Flags if symptoms don't align with condition
- Provides expected symptoms for context

### 3. Age-Based Symptom Validation

Age groups and their typical symptoms:

- **Child (< 12 years):** Ear infections, croup, chicken pox, teething, colic
- **Adolescent (12-17 years):** Acne, growth spurt, mood changes, puberty symptoms
- **Adult (18-64 years):** Work stress, lifestyle diseases, reproductive health
- **Elderly (65+ years):** Arthritis, memory loss, osteoporosis, frailty

**Validation Rule: `RULE_AGE_001`**

- Matches symptoms to appropriate age groups
- Provides context about age-appropriateness

## API Integration

### Using Symptom Verification

#### 1. Basic Symptom Verification

```typescript
import { MedicalSafetyDetector } from "@/lib/compliance/medicalSafetyDetector";

// Verify symptoms without patient context
const result = MedicalSafetyDetector.verifySymptoms([
  "fever",
  "cough",
  "shortness of breath",
]);

console.log(result);
// Output:
// {
//   isVerified: true,
//   genderCompatible: true,
//   conditionCompatible: true,
//   flaggedSymptoms: [],
//   notes: ['No symptoms provided'] or specific notes
// }
```

#### 2. Symptom Verification with Patient Context

```typescript
// Verify symptoms with patient gender
const result = MedicalSafetyDetector.verifySymptoms(
  ["vaginal bleeding", "menstrual pain"],
  "male", // patientGender
);

console.log(result);
// Output:
// {
//   isVerified: false,
//   genderCompatible: false,
//   conditionCompatible: true,
//   flaggedSymptoms: ['vaginal bleeding', 'menstrual pain'],
//   notes: ['RULE_GENDER_001: Female-specific symptoms detected in male patient: vaginal bleeding, menstrual pain']
// }
```

#### 3. Request Analysis with Symptom Verification

```typescript
const userRequest = "I'm experiencing fever, cough, and difficulty breathing";

// Analyze with full patient context
const analysis = MedicalSafetyDetector.analyzeRequestWithContext(
  userRequest,
  "female", // patientGender
  "asthma", // medicalCondition
  35, // patientAge
  ["fever", "cough", "shortness of breath"], // explicit symptoms
);

console.log(analysis);
// Output:
// {
//   hasPrescriptionRequest: false,
//   hasControlledSubstance: false,
//   hasSelfHarmRequest: false,
//   hasDosageAdvice: false,
//   hasIllegalActivity: false,
//   hasProfessionalImpersonation: false,
//   hasDiagnosticClaim: false,
//   symptomVerification: {
//     isVerified: true,
//     genderCompatible: true,
//     conditionCompatible: true,
//     flaggedSymptoms: [],
//     notes: ['RULE_CONDITION_002: Found 1 symptom(s) consistent with asthma']
//   },
//   riskLevel: 'SAFE',
//   violations: [],
//   detectedDrugs: [],
//   detectedDosages: []
// }
```

#### 4. Response Analysis with Symptom Verification

```typescript
const aiResponse =
  "Your symptoms suggest asthma. You may experience wheezing and chest tightness.";

const responseAnalysis = MedicalSafetyDetector.analyzeResponseWithContext(
  aiResponse,
  "female",
  "asthma",
  35,
);

console.log(responseAnalysis);
// Risk level escalated if response recommends inappropriate symptoms
```

### Integration in API Route

Update your API routes to include symptom verification:

```typescript
// app/api/getchat/route.ts

import { MedicalSafetyDetector } from "@/lib/compliance/medicalSafetyDetector";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, patientGender, medicalCondition, patientAge, symptoms } =
      await request.json();

    // Analyze request with symptom verification
    const analysis = MedicalSafetyDetector.analyzeRequestWithContext(
      prompt,
      patientGender,
      medicalCondition,
      patientAge,
      symptoms,
    );

    // Check compliance status
    const isCompliant = analysis.riskLevel !== "CRITICAL";

    if (!isCompliant) {
      return NextResponse.json(
        {
          success: false,
          message: "Request contains medical safety violations",
          violations: analysis.violations,
          symptomVerification: analysis.symptomVerification,
        },
        { status: 400 },
      );
    }

    // Process request if compliant
    // ... your logic here

    return NextResponse.json({
      success: true,
      message: "Request processed successfully",
      analysis,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
```

## Symptom Extraction

The system automatically extracts symptoms from medical text:

```typescript
// Symptoms are auto-detected from text including:
const autoDetectedKeywords = [
  "pain",
  "ache",
  "fever",
  "cough",
  "nausea",
  "vomiting",
  "fatigue",
  "weakness",
  "headache",
  "dizziness",
  "swelling",
  "rash",
  "itching",
  "shortness of breath",
  "chest pain",
  "inflammation",
  "bleeding",
  "discharge",
  "tremor",
  "sweating",
  "anxiety",
  "depression",
  "insomnia",
  // ... and more
];
```

## Validation Rules Reference

### Gender-Based Rules

| Rule ID         | Description                              | Risk Level |
| --------------- | ---------------------------------------- | ---------- |
| RULE_GENDER_001 | Female-specific symptoms in male patient | WARNING    |
| RULE_GENDER_002 | Male-specific symptoms in female patient | WARNING    |

### Condition-Based Rules

| Rule ID            | Description                                | Risk Level |
| ------------------ | ------------------------------------------ | ---------- |
| RULE_CONDITION_001 | No symptoms align with reported condition  | WARNING    |
| RULE_CONDITION_002 | Symptoms match expected condition symptoms | INFO       |

### Age-Based Rules

| Rule ID      | Description                        | Risk Level |
| ------------ | ---------------------------------- | ---------- |
| RULE_AGE_001 | Symptoms consistent with age group | INFO       |

### Response-Specific Rules

| Rule ID                 | Description                                      | Risk Level |
| ----------------------- | ------------------------------------------------ | ---------- |
| RULE_RESPONSE_GENDER    | Response recommends gender-incompatible symptoms | WARNING    |
| RULE_RESPONSE_CONDITION | Response misaligned with medical condition       | WARNING    |

## Examples

### Example 1: Valid Asthma Case

```typescript
// Patient profile
const gender = "female";
const condition = "asthma";
const age = 28;
const symptoms = ["wheezing", "shortness of breath", "chest tightness"];

const result = MedicalSafetyDetector.verifySymptoms(
  symptoms,
  gender,
  condition,
  age,
);

// Result: isVerified = true
// All symptoms are consistent with asthma
```

### Example 2: Invalid Symptom-Gender Mismatch

```typescript
// Male patient reporting pregnancy symptoms
const gender = "male";
const symptoms = [
  "morning sickness",
  "pregnancy cravings",
  "breast tenderness",
];

const result = MedicalSafetyDetector.verifySymptoms(symptoms, gender);

// Result: isVerified = false
// flaggedSymptoms: ['pregnancy cravings', 'breast tenderness']
// notes: ['RULE_GENDER_001: Female-specific symptoms detected in male patient...']
```

### Example 3: Condition Mismatch

```typescript
// Patient with diabetes reporting asthma symptoms
const condition = "diabetes";
const symptoms = ["wheezing", "asthma", "shortness of breath"];

const result = MedicalSafetyDetector.verifySymptoms(
  symptoms,
  "female",
  condition,
);

// Result: isVerified = false
// notes: ['RULE_CONDITION_001: Symptoms do not match reported condition (diabetes)...']
```

## Best Practices

1. **Always provide patient context** when available:
   - Gender significantly improves validation accuracy
   - Medical condition is crucial for relevance checks
   - Age group helps contextualize symptoms

2. **Update medical conditions** regularly:
   - Keep patient medical records current
   - Multiple conditions can be comma-separated

3. **Store symptoms explicitly**:
   - Use the symptoms array in Chat model
   - Enables better tracking and analysis
   - Facilitates symptom history

4. **Monitor verification results**:
   - Review flagged symptoms regularly
   - Investigate mismatches for data quality
   - Use insights to improve patient profiles

5. **Test your integration**:
   - Run test cases for each gender
   - Verify with multiple conditions
   - Test edge cases and age groups

## Extending the System

### Adding New Symptoms

To add gender-specific symptoms:

```typescript
private static readonly FEMALE_ONLY_SYMPTOMS = new Set([
  // ... existing symptoms
  'new_symptom_here' // Add here
]);
```

### Adding New Conditions

To add a new medical condition:

```typescript
private static readonly CONDITION_SYMPTOM_MAPPINGS: Record<string, Set<string>> = {
  'new_condition': new Set([
    'symptom1',
    'symptom2',
    'symptom3'
  ])
};
```

### Custom Validation Rules

Extend the class to add custom rules:

```typescript
static verifyCustomRule(context: any): CustomResult {
  // Your custom validation logic
  return { ... };
}
```

## Troubleshooting

### Issue: All symptoms pass validation

**Cause:** Gender/condition context not provided

**Solution:** Ensure you're using `analyzeRequestWithContext()` or `verifySymptoms()` with patient parameters

### Issue: False positives on common symptoms

**Cause:** Symptoms like "pain" are generic

**Solution:** This is expected. Use medical condition context to disambiguate

### Issue: Symptom not being recognized

**Cause:** Symptom keyword not in the system

**Solution:** Check the symptom extraction keyword list and add if needed

## Future Enhancements

- [ ] Machine learning-based symptom validation
- [ ] Medication-symptom interaction checks
- [ ] Pregnancy-related special rules
- [ ] Drug interaction validation with conditions
- [ ] Contraindication detection for condition-specific rules
- [ ] Multi-language symptom support
- [ ] Historical symptom pattern analysis

## Support

For issues or feature requests, refer to the medical compliance team or review the implementation checklist in `IMPLEMENTATION_CHECKLIST.md`.
