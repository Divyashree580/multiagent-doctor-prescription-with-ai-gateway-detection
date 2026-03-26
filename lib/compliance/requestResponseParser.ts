/**
 * Request/Response Parser
 * 
 * Parses and extracts medical information from chatbot requests and responses
 */

export interface MedicalContext {
  symptoms: string[];
  conditions: string[];
  medications: string[];
  allergies: string[];
  age?: number;
  gender?: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
  intent: 'symptom_inquiry' | 'medication_info' | 'diagnosis_request' | 'prescription_request' | 'general_query';
  additionalContext: Record<string, any>;
}

export interface ParsedResponse {
  type: 'informational' | 'hedged_guidance' | 'prescription_like' | 'diagnostic' | 'redirectional';
  hasDisclaimers: boolean;
  disclaimerText?: string;
  mainContent: string;
  recommendations?: string[];
  rawAnalysis: Record<string, any>;
}

export class RequestResponseParser {
  // Common symptoms
  private static readonly SYMPTOMS = {
    pain: ['pain', 'ache', 'hurts', 'sore', 'tender'],
    respiratory: ['cough', 'coughing', 'sneeze', 'sneezing', 'congestion', 'congested', 'wheezing', 'shortness of breath', 'breathless', 'throat'],
    digestive: ['nausea', 'nauseated', 'vomiting', 'diarrhea', 'constipation', 'heartburn', 'acid reflux', 'stomach', 'belly'],
    fever: ['fever', 'chills', 'temperature', 'hot', 'sweating'],
    neurological: ['headache', 'migraine', 'dizziness', 'dizzy', 'vertigo', 'confusion', 'memory loss'],
    cardiovascular: ['chest pain', 'heart palpitations', 'heart racing', 'irregular heartbeat', 'blood pressure'],
    skin: ['rash', 'itching', 'eczema', 'acne', 'psoriasis', 'hives', 'swelling'],
    general: ['fatigue', 'tired', 'weakness', 'malaise', 'feeling unwell'],
  };

  // Common conditions
  private static readonly CONDITIONS = {
    chronic: ['diabetes', 'hypertension', 'asthma', 'arthritis', 'cancer', 'heart disease', 'kidney disease', 'liver disease'],
    acute: ['flu', 'cold', 'infection', 'bronchitis', 'pneumonia', 'strep throat', 'urinary tract infection', 'uti'],
    mental_health: ['anxiety', 'depression', 'stress', 'panic disorder', 'ocd', 'ptsd', 'bipolar'],
  };

  // Medication classes
  private static readonly MEDICATION_CLASSES = {
    antibiotics: ['antibiotic', 'amoxicillin', 'penicillin', 'azithromycin', 'ciprofloxacin'],
    painkillers: ['painkiller', 'pain reliever', 'nsaid', 'ibuprofen', 'acetaminophen', 'aspirin'],
    antihistamines: ['antihistamine', 'allergy', 'cetirizine', 'loratadine', 'diphenhydramine'],
    antacids: ['antacid', 'acid reflux', 'omeprazole', 'ranitidine', 'famotidine'],
    decongestants: ['decongestant', 'nasal spray', 'pseudoephedrine', 'phenylephrine'],
  };

  // Duration patterns
  private static readonly DURATION_PATTERN = /(\d+)\s+(?:hour|day|week|month)s?/i;

  /**
   * Parse a user request and extract medical context
   */
  static parseRequest(request: string): MedicalContext {
    const lowerRequest = request.toLowerCase();

    const symptoms = this.extractSymptoms(request);
    const conditions = this.extractConditions(request);
    const medications = this.extractMedications(request);
    const allergies = this.extractAllergies(request);
    const { age, gender } = this.extractDemographics(request);
    const duration = this.extractDuration(request);
    const severity = this.extractSeverity(request);
    const intent = this.determineIntent(request, {
      symptoms,
      conditions,
      medications,
    });

    return {
      symptoms,
      conditions,
      medications,
      allergies,
      age,
      gender,
      duration,
      severity,
      intent,
      additionalContext: {
        hasNegatives: lowerRequest.includes('no ') || lowerRequest.includes('don\'t have'),
        hasUrgency: /urgent|emergency|severe|critical|can't|unable/i.test(request),
        asksForPrescription: /prescription|prescribe|rx|script/i.test(request),
        asksForDosage: /dose|dosage|how much|how often/i.test(request),
      },
    };
  }

  /**
   * Parse an AI response and analyze its compliance status
   */
  static parseResponse(response: string): ParsedResponse {
    const hasDisclaimers = this.hasProperDisclaimers(response);
    const disclaimerText = this.extractDisclaimerText(response);
    const type = this.determineResponseType(response);
    const recommendations = this.extractRecommendations(response);

    return {
      type,
      hasDisclaimers,
      disclaimerText,
      mainContent: response.substring(0, 500),
      recommendations,
      rawAnalysis: {
        mentionsConcern: /concern|worry|worried|concerned/i.test(response),
        suggestsConsultation: /consult|doctor|healthcare|physician|professional|medical|provider/i.test(response),
        usesHedgingLanguage: /may|might|could|possibly|likely|appears|seems|suggests/i.test(response),
        specifiesDosage: /\d+\s*(?:mg|ml|tablespoon|teaspoon)/i.test(response),
        namesMedications: this.findMedicationMentions(response).length > 0,
      },
    };
  }

  /**
   * Extract symptoms from text
   */
  private static extractSymptoms(text: string): string[] {
    const lowerText = text.toLowerCase();
    const symptoms: string[] = [];

    for (const [category, symptomList] of Object.entries(this.SYMPTOMS)) {
      for (const symptom of symptomList) {
        if (lowerText.includes(symptom)) {
          symptoms.push(symptom);
        }
      }
    }

    return [...new Set(symptoms)]; // Remove duplicates
  }

  /**
   * Extract conditions from text
   */
  private static extractConditions(text: string): string[] {
    const lowerText = text.toLowerCase();
    const conditions: string[] = [];

    for (const categoryConditions of Object.values(this.CONDITIONS)) {
      for (const condition of categoryConditions) {
        if (lowerText.includes(condition)) {
          conditions.push(condition);
        }
      }
    }

    return [...new Set(conditions)];
  }

  /**
   * Extract medications from text
   */
  private static extractMedications(text: string): string[] {
    const lowerText = text.toLowerCase();
    const medications: string[] = [];

    for (const classMeds of Object.values(this.MEDICATION_CLASSES)) {
      for (const med of classMeds) {
        if (lowerText.includes(med)) {
          medications.push(med);
        }
      }
    }

    return [...new Set(medications)];
  }

  /**
   * Extract allergies from text
   */
  private static extractAllergies(text: string): string[] {
    const allergies: string[] = [];
    const allergyPattern = /(?:allergic?(?:\s+to)?|allerg(?:y|ies)\s+to|reaction\s+to)\s+([^,.;]+)/gi;

    let match;
    while ((match = allergyPattern.exec(text)) !== null) {
      allergies.push(match[1].trim());
    }

    return allergies;
  }

  /**
   * Extract age and gender from text
   */
  private static extractDemographics(text: string): { age?: number; gender?: string } {
    const ageMatch = text.match(/(\d+)\s*(?:year|yo|old|age)/i);
    const age = ageMatch ? parseInt(ageMatch[1], 10) : undefined;

    const genderMatch = text.match(/(?:i'm|i am|my|me)\s+(male|female|man|woman|boy|girl)/i);
    const gender = genderMatch ? genderMatch[1].toLowerCase() : undefined;

    return { age, gender };
  }

  /**
   * Extract symptom duration from text
   */
  private static extractDuration(text: string): string | undefined {
    const match = text.match(this.DURATION_PATTERN);
    return match ? match[0] : undefined;
  }

  /**
   * Determine severity level from text
   */
  private static extractSeverity(text: string): 'mild' | 'moderate' | 'severe' | 'unknown' {
    const lowerText = text.toLowerCase();

    if (/severe|critical|emergency|unbearable|can't|unable|serious/i.test(text)) {
      return 'severe';
    }

    if (/moderate|significant|bothering|affecting|impacting/i.test(text)) {
      return 'moderate';
    }

    if (/mild|slight|minor|little|small/i.test(text)) {
      return 'mild';
    }

    return 'unknown';
  }

  /**
   * Determine the user's intent from the request
   */
  private static determineIntent(
    text: string,
    context: { symptoms: string[]; conditions: string[]; medications: string[] }
  ): MedicalContext['intent'] {
    const lowerText = text.toLowerCase();

    if (/prescription|prescribe|rx|script|give\s+me/i.test(text)) {
      return 'prescription_request';
    }

    if (/diagnose|what\s+do\s+i\s+have|what\s+is\s+this|what\s+disease/i.test(text)) {
      return 'diagnosis_request';
    }

    if (/how\s+to\s+(?:treat|manage|use)|dosage|dose|how\s+much|how\s+often/i.test(text)) {
      return 'medication_info';
    }

    if (context.symptoms.length > 0 && !lowerText.includes('what')) {
      return 'symptom_inquiry';
    }

    return 'general_query';
  }

  /**
   * Check if response has proper medical disclaimers
   */
  private static hasProperDisclaimers(response: string): boolean {
    const disclaimerPatterns = [
      /consult.*(?:doctor|physician|healthcare.*provider|medical.*professional)/i,
      /not a substitute for professional medical advice/i,
      /seek.*medical.*attention/i,
      /emergency.*call.*911/i,
      /for informational purposes only/i,
      /do not rely solely/i,
    ];

    return disclaimerPatterns.some(pattern => pattern.test(response));
  }

  /**
   * Extract disclaimer text from response
   */
  private static extractDisclaimerText(response: string): string | undefined {
    const disclaimerPatterns = [
      /(?:however,?|but,?|importantly,?)\s+[^.!?]+(?:consult|doctor|medical|professional)[^.!?]*[.!?]/i,
      /^.*(?:disclaimer|important|note)[^.!?]*[.!?]/im,
    ];

    for (const pattern of disclaimerPatterns) {
      const match = response.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Determine the type of response
   */
  private static determineResponseType(response: string): ParsedResponse['type'] {
    const hasHedging = /may|might|could|possibly|likely|appears|seems/i.test(response);
    const specifiesDosage = /\d+\s*(?:mg|ml|dose|tablet)/i.test(response);
    const namesMedications = this.findMedicationMentions(response).length > 0;
    const hasDiagnosis = /you\s+have|you\s+may\s+have|consistent\s+with/i.test(response);
    const suggestsConsultation = /consult|doctor|medical|professional|healthcare/i.test(response);

    if (specifiesDosage || (namesMedications && !hasHedging)) {
      return 'prescription_like';
    }

    if (hasDiagnosis && !hasHedging) {
      return 'diagnostic';
    }

    if (hasHedging && suggestsConsultation) {
      return 'hedged_guidance';
    }

    if (suggestsConsultation) {
      return 'redirectional';
    }

    return 'informational';
  }

  /**
   * Extract recommendations from response
   */
  private static extractRecommendations(response: string): string[] {
    const recommendations: string[] = [];
    const recPatterns = [
      /(?:recommend|suggest|advise)\s+[^.!?]+[.!?]/gi,
      /(?:you\s+should|you\s+may\s+want\s+to)\s+[^.!?]+[.!?]/gi,
      /(?:consider|try)\s+[^.!?]+[.!?]/gi,
    ];

    for (const pattern of recPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        recommendations.push(match[0].trim());
      }
    }

    return recommendations;
  }

  /**
   * Find medication mentions in text (helper for type determination)
   */
  private static findMedicationMentions(text: string): string[] {
    const lowerText = text.toLowerCase();
    const medications: string[] = [];

    for (const classMeds of Object.values(this.MEDICATION_CLASSES)) {
      for (const med of classMeds) {
        if (lowerText.includes(med)) {
          medications.push(med);
        }
      }
    }

    return medications;
  }

  /**
   * Generate a summary of parsed content (non-PHI safe)
   */
  static generateSummary(context: MedicalContext & { responseType?: ParsedResponse['type'] }): string {
    const parts: string[] = [];

    if (context.intent === 'prescription_request') {
      parts.push('Prescription request');
    }

    if (context.symptoms.length > 0) {
      parts.push(`Symptoms: ${context.symptoms.join(', ')}`);
    }

    if (context.severity && context.severity !== 'unknown') {
      parts.push(`Severity: ${context.severity}`);
    }

    if (context.medications.length > 0) {
      parts.push(`Current meds: ${context.medications.join(', ')}`);
    }

    if (context.allergies.length > 0) {
      parts.push(`Allergies: ${context.allergies.join(', ')}`);
    }

    return parts.length > 0
      ? parts.join(' | ')
      : `User query classified as ${context.intent}`;
  }
}
