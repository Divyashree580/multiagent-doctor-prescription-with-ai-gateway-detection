/**
 * Medical Safety Detector
 * 
 * Analyzes requests and responses for medical safety violations
 * including prescription detection, dosage advice, and illegal requests
 */

export interface MedicalSafetyAnalysis {
  hasPrescriptionRequest: boolean;
  hasControlledSubstance: boolean;
  hasSelfHarmRequest: boolean;
  hasDosageAdvice: boolean;
  hasIllegalActivity: boolean;
  hasProfessionalImpersonation: boolean;
  hasDiagnosticClaim: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  violations: string[];
  detectedDrugs: string[];
  detectedDosages: string[];
}

export class MedicalSafetyDetector {
  // Controlled substances list (DEA schedules I-V + common prescribed controlled drugs)
  private static readonly CONTROLLED_SUBSTANCES = new Set([
    'fentanyl',
    'morphine',
    'oxycodone',
    'hydrocodone',
    'codeine',
    'tramadol',
    'benzodiazepine',
    'diazepam',
    'alprazolam',
    'lorazepam',
    'clonazepam',
    'methadone',
    'buprenorphine',
    'adderall',
    'ritalin',
    'amphetamine',
    'methamphetamine',
    'cocaine',
    'heroin',
    'cannabis',
    'barbiturate',
    'pentobarbital',
    'secobarbital',
    'anabolic steroid',
    'testosterone',
    'stanozolol',
  ]);

  // Common prescription medications
  private static readonly MEDICATIONS = new Set([
    'amoxicillin',
    'metformin',
    'lisinopril',
    'aspirin',
    'ibuprofen',
    'acetaminophen',
    'warfarin',
    'atorvastatin',
    'omeprazole',
    'ciprofloxacin',
    'azithromycin',
    'prednisone',
    'insulin',
    'metoprolol',
    'sertraline',
    'paroxetine',
    'fluoxetine',
    'venlafaxine',
    'escitalopram',
    'atorvastatin',
    'simvastatin',
    'pravastatin',
    'levothyroxine',
    'synthroid',
    'thyroid',
    'blood pressure',
    'antidepressant',
    'antibiotic',
    'painkiller',
    'sleeping pill',
    'cholesterol',
    'diabetes',
    'cancer',
    'chemo',
    'radiation',
  ]);

  // Dosage pattern regex
  private static readonly DOSAGE_PATTERN = /(\d+\.?\d*)\s*(mg|mcg|ml|g|units?|doses?|tablets?|capsules?|pills?|IU)\s*(?:twice|daily|once|bd|tid|qid|every|per)/i;

  // Prescription request patterns
  private static readonly PRESCRIPTION_PATTERNS = [
    /prescribe\s+(me|him|her|them)/i,
    /give\s+me\s+a\s+prescription/i,
    /write\s+me\s+a\s+prescription/i,
    /i\s+need\s+a\s+prescription\s+for/i,
    /can\s+you\s+prescribe/i,
    /prescription\s+for/i,
    /rx\s+for/i,
  ];

  // Self-harm patterns
  private static readonly SELF_HARM_PATTERNS = [
    /suicide|kill\s+myself|self\s+harm|hurt\s+myself|harm\s+myself/i,
    /overdose|poison|lethal\s+dose/i,
    /how\s+to\s+(?:kill|hurt|harm)|ways?\s+to\s+(?:kill|hurt|harm)/i,
  ];

  // Illegal activity patterns
  private static readonly ILLEGAL_PATTERNS = [
    /how\s+to\s+get|obtaining|acquire|obtain.*(?:drug|substance|medicine)/i,
    /buy.*(?:drug|heroin|cocaine|meth)/i,
    /sell.*(?:prescription|controlled)/i,
    /illegal.*(?:drug|substance)/i,
    /forge.*prescription|fake.*prescription|counterfeit/i,
  ];

  // Professional impersonation patterns
  private static readonly IMPERSONATION_PATTERNS = [
    /i\s+am\s+(?:a\s+)?(?:doctor|physician|nurse|pharmacist)/i,
    /i\s+can\s+(?:prescribe|diagnose|recommend.*treatment)/i,
    /as\s+(?:a\s+)?(?:medical|health)\s+professional/i,
  ];

  // Definitive diagnosis patterns (in responses)
  private static readonly DEFINITIVE_DIAGNOSIS = [
    /you\s+have\s+(\w+)/i,
    /you\s+(?:are\s+)?(?:suffering|diagnosed)\s+with/i,
    /this\s+is\s+definitely\s+(\w+)/i,
    /you\s+certainly\s+have\s+(?:the\s+)?(?:disease|condition)/i,
  ];

  /**
   * Analyze a user request for medical safety violations
   */
  static analyzeRequest(request: string): MedicalSafetyAnalysis {
    const lowerRequest = request.toLowerCase();
    const violations: string[] = [];
    const detectedDrugs: string[] = [];
    const detectedDosages: string[] = [];

    let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';

    // Check for prescription request
    const hasPrescriptionRequest = this.PRESCRIPTION_PATTERNS.some(pattern =>
      pattern.test(request)
    );
    if (hasPrescriptionRequest) {
      violations.push('RULE_001: Explicit prescription request');
      riskLevel = 'CRITICAL';
    }

    // Check for controlled substances
    const hasControlledSubstance = this.CONTROLLED_SUBSTANCES.size > 0 && 
      Array.from(this.CONTROLLED_SUBSTANCES).some(drug =>
        lowerRequest.includes(drug)
      );
    if (hasControlledSubstance) {
      detectedDrugs.push(
        ...Array.from(this.CONTROLLED_SUBSTANCES).filter(drug =>
          lowerRequest.includes(drug)
        )
      );
      violations.push('RULE_002: Controlled substance request');
      riskLevel = 'CRITICAL';
    }

    // Check for self-harm request
    const hasSelfHarmRequest = this.SELF_HARM_PATTERNS.some(pattern =>
      pattern.test(request)
    );
    if (hasSelfHarmRequest) {
      violations.push('RULE_003: Self-harm or harm to others');
      riskLevel = 'CRITICAL';
    }

    // Check for illegal activity
    const hasIllegalActivity = this.ILLEGAL_PATTERNS.some(pattern =>
      pattern.test(request)
    );
    if (hasIllegalActivity) {
      violations.push('RULE_002: Illegal request - controlled substance acquisition');
      riskLevel = 'CRITICAL';
    }

    // Check for professional impersonation attempt
    const hasProfessionalImpersonation = this.IMPERSONATION_PATTERNS.some(pattern =>
      pattern.test(request)
    );
    if (hasProfessionalImpersonation) {
      violations.push('RULE_005: Professional impersonation attempt');
      riskLevel = 'WARNING';
    }

    // Extract medications mentioned
    const mentionedMedications = Array.from(this.MEDICATIONS).filter(med =>
      lowerRequest.includes(med)
    );
    detectedDrugs.push(...mentionedMedications);

    // Extract dosages mentioned
    const dosageMatches = request.match(this.DOSAGE_PATTERN);
    if (dosageMatches) {
      detectedDosages.push(dosageMatches[0]);
    }

    return {
      hasPrescriptionRequest,
      hasControlledSubstance,
      hasSelfHarmRequest,
      hasDosageAdvice: detectedDosages.length > 0,
      hasIllegalActivity,
      hasProfessionalImpersonation,
      hasDiagnosticClaim: false, // Not applicable to requests
      riskLevel,
      violations,
      detectedDrugs,
      detectedDosages,
    };
  }

  /**
   * Analyze an AI response for medical safety violations
   */
  static analyzeResponse(response: string): MedicalSafetyAnalysis {
    const lowerResponse = response.toLowerCase();
    const violations: string[] = [];
    const detectedDrugs: string[] = [];
    const detectedDosages: string[] = [];

    let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';

    // Check for drug + dosage combination
    const drugDosageMatches = this.findDrugDosagePairs(response);
    if (drugDosageMatches.length > 0) {
      detectedDosages.push(...drugDosageMatches.map(m => m.dosage));
      detectedDrugs.push(...drugDosageMatches.map(m => m.drug));
      violations.push('RULE_101: Drug name + dosage present');
      riskLevel = 'CRITICAL';
    }

    // Check for prescriptive clinical language
    const prescriptiveLanguage = this.hasPrescriptiveLanguage(response);
    if (prescriptiveLanguage) {
      violations.push('RULE_102: Prescriptive clinical language');
      riskLevel = 'CRITICAL';
    }

    // Check for definitive diagnosis without hedging
    const hasFirmDiagnosis = this.hasFirmDiagnosis(response);
    if (hasFirmDiagnosis) {
      violations.push('RULE_103: Definitive diagnosis without hedging');
      riskLevel = 'WARNING';
    }

    // Check for medication dosage modification advice
    const hasDosageModification = this.hasDosageModification(response);
    if (hasDosageModification) {
      violations.push('RULE_104: Dosage modification advice');
      riskLevel = 'CRITICAL';
    }

    // Check for treatment-intent medicine recommendation
    const hasTreatmentRecommendation = this.hasTreatmentRecommendation(response);
    if (hasTreatmentRecommendation) {
      violations.push('RULE_105: Treatment-intent medicine recommendation');
      riskLevel = 'WARNING';
    }

    // Extract mentioned medications
    const mentionedMedications = Array.from(this.MEDICATIONS).filter(med =>
      lowerResponse.includes(med)
    );
    detectedDrugs.push(...mentionedMedications);

    return {
      hasPrescriptionRequest: false,
      hasControlledSubstance: false,
      hasSelfHarmRequest: false,
      hasDosageAdvice: detectedDosages.length > 0,
      hasIllegalActivity: false,
      hasProfessionalImpersonation: false,
      hasDiagnosticClaim: hasFirmDiagnosis,
      riskLevel,
      violations,
      detectedDrugs,
      detectedDosages,
    };
  }

  /**
   * Find drug + dosage pairs in text
   */
  private static findDrugDosagePairs(text: string): Array<{ drug: string; dosage: string }> {
    const pairs: Array<{ drug: string; dosage: string }> = [];
    const lowerText = text.toLowerCase();

    // Look for medication names followed by dosages
    for (const drug of this.MEDICATIONS) {
      const drugIndex = lowerText.indexOf(drug);
      if (drugIndex !== -1) {
        // Check for dosage pattern near the drug name
        const context = text.substring(
          Math.max(0, drugIndex - 50),
          Math.min(text.length, drugIndex + drug.length + 100)
        );

        const dosageMatch = context.match(this.DOSAGE_PATTERN);
        if (dosageMatch) {
          pairs.push({
            drug,
            dosage: dosageMatch[0],
          });
        }
      }
    }

    return pairs;
  }

  /**
   * Check for prescriptive clinical language
   * Examples: "I prescribe", "you should take", "take this medication"
   */
  private static hasPrescriptiveLanguage(response: string): boolean {
    const prescriptivePatterns = [
      /i\s+prescribe/i,
      /you\s+(?:must|should|need to)\s+take/i,
      /take\s+(?:this\s+)?(?:medicine|medication|drug|pill)/i,
      /i\s+recommend\s+(?:taking|using)\s+\[drug\]/i,
      /the\s+treatment\s+for\s+[\w\s]+\s+is\s+\[drug\]/i,
      /apply\s+\[drug\]\s+(?:twice|daily|once)/i,
    ];

    return prescriptivePatterns.some(pattern => pattern.test(response));
  }

  /**
   * Check for firm diagnosis without appropriate hedging
   * Examples: "You have diabetes" (bad) vs "You might have diabetes" (good)
   */
  private static hasFirmDiagnosis(response: string): boolean {
    const firmDiagnosisPatterns = [
      /you\s+have\s+(?:the\s+)?[\w\s]+(?:disease|condition|disorder|illness)(?!.*(?:could|might|may|possibly|likely))/i,
      /you\s+(?:are\s+)?(?:definitely|certainly|clearly).*(?:have|suffer from)\s+[\w\s]+/i,
      /this\s+is\s+definitely\s+[\w\s]+(?!.*(?:could|might|may|possibly))/i,
    ];

    const hasFormDiagnosis = firmDiagnosisPatterns.some(pattern => pattern.test(response));

    // Check if there's proper hedging language
    const hedgingPatterns = [
      /(?:could|might|may|possibly|likely|appears|seems|suggests|consistent\s+with)/i,
    ];

    const hasHedging = hedgingPatterns.some(pattern => pattern.test(response));

    return hasFormDiagnosis && !hasHedging;
  }

  /**
   * Check for dosage modification advice
   * Examples: "increase your dose", "lower your medication"
   */
  private static hasDosageModification(response: string): boolean {
    const dosageModPatterns = [
      /(?:increase|decrease|reduce|raise|lower|adjust|change)\s+(?:your|the)\s+(?:dose|dosage|medication)/i,
      /take\s+(?:more|less)\s+(?:of\s+)?(?:your|the)\s+[\w\s]+(?:medication|medicine|pill)/i,
      /stop\s+(?:taking|using)\s+[\w\s]+(?:medication|medicine)/i,
      /switch\s+(?:to|from)\s+[\w\s]+(?:medication|medicine)/i,
    ];

    return dosageModPatterns.some(pattern => pattern.test(response));
  }

  /**
   * Check for treatment-intent medicine recommendation
   * Distinguish from informational mentions
   */
  private static hasTreatmentRecommendation(response: string): boolean {
    const treatmentPatterns = [
      /i\s+(?:recommend|suggest|advise)\s+(?:taking|using|trying)\s+[\w\s]+/i,
      /you\s+should\s+(?:try|take|use)\s+[\w\s]+\s+for\s+[\w\s]+/i,
      /the\s+(?:best|most)\s+(?:treatment|cure|remedy)\s+is\s+[\w\s]+/i,
      /this\s+will\s+help\s+(?:with|treat|cure)\s+[\w\s]+/i,
    ];

    return treatmentPatterns.some(pattern => pattern.test(response));
  }

  /**
   * Generate a content summary for logging (non-PHI)
   */
  static generateContentSummary(
    content: string,
    analysis: MedicalSafetyAnalysis
  ): string {
    const summary: string[] = [];

    if (analysis.violations.length > 0) {
      summary.push(`Violations detected: ${analysis.violations.join(', ')}`);
    }

    if (analysis.detectedDrugs.length > 0) {
      summary.push(`Drugs mentioned: ${analysis.detectedDrugs.join(', ')}`);
    }

    if (analysis.detectedDosages.length > 0) {
      summary.push(`Dosages: ${analysis.detectedDosages.join(', ')}`);
    }

    if (summary.length === 0) {
      // Generic summary without content details
      return `${content.substring(0, 80)}...`;
    }

    return summary.join(' | ');
  }

  /**
   * Determine compliance status from analysis
   */
  static determineComplianceStatus(
    analysis: MedicalSafetyAnalysis
  ): 'COMPLIANT' | 'VIOLATION' | 'NEEDS_REVIEW' {
    if (analysis.riskLevel === 'CRITICAL') {
      return 'VIOLATION';
    }

    if (analysis.riskLevel === 'WARNING' && analysis.violations.length > 0) {
      return 'NEEDS_REVIEW';
    }

    if (analysis.violations.length > 0) {
      return 'VIOLATION';
    }

    return 'COMPLIANT';
  }

  /**
   * Get policy rule ID from violations
   */
  static getPolicyRuleId(violations: string[]): string | null {
    if (violations.length === 0) return null;

    // Extract rule ID from first violation
    const match = violations[0].match(/RULE_\d+/);
    return match ? match[0] : null;
  }
}
