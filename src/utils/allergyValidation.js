/**
 * Allergy Alert System
 * Sistema de Alertas de Alergias
 * 
 * Validates medications against patient allergies and provides warnings
 * when prescribing medications that may cause allergic reactions.
 */

// Common medication categories and their generic names
const MEDICATION_DATABASE = {
  // Antibióticos
  penicilina: ['penicilina', 'amoxicilina', 'ampicilina', 'penicilina g', 'penicilina v'],
  cefalosporinas: ['cefalexina', 'cefuroxima', 'ceftriaxona', 'cefotaxima', 'cefazolina'],
  sulfamidas: ['sulfametoxazol', 'trimetoprim', 'sulfa', 'sulfadiazina', 'sulfasalazina'],
  macrólidos: ['azitromicina', 'claritromicina', 'eritromicina'],
  quinolonas: ['ciprofloxacino', 'levofloxacino', 'moxifloxacino'],
  
  // Analgésicos
  aines: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'aspirina', 'ketorolaco', 'meloxicam'],
  opioides: ['morfina', 'tramadol', 'fentanilo', 'codeína', 'oxicodona', 'hidrocodona'],
  
  // Anestésicos
  anestésicos_locales: ['lidocaína', 'bupivacaína', 'prilocaína', 'mepivacaína'],
  
  // Contrastes
  contraste_yodado: ['contraste yodado', 'yodo', 'medio de contraste', 'contraste radiológico'],
  
  // Otros
  látex: ['látex', 'guantes de látex'],
  
  // Anticoagulantes
  anticoagulantes: ['warfarina', 'heparina', 'enoxaparina', 'rivaroxabán'],
};

// Cross-reactivity warnings (medicamentos con reacción cruzada)
const CROSS_REACTIVITY = {
  penicilina: ['cefalosporinas'],
  aspirina: ['aines'],
  sulfamidas: ['sulfasalazina'],
  látex: ['frutas tropicales (plátano, aguacate, kiwi)']
};

/**
 * Parse patient allergies from string format
 * @param {string} allergiesString - Comma-separated allergy string
 * @returns {Array<string>} Array of normalized allergies
 */
export function parseAllergies(allergiesString) {
  if (!allergiesString || typeof allergiesString !== 'string') {
    return [];
  }
  
  return allergiesString
    .split(',')
    .map(allergy => allergy.trim().toLowerCase())
    .filter(allergy => allergy.length > 0);
}

/**
 * Normalize medication name for comparison
 * @param {string} medication - Medication name
 * @returns {string} Normalized name
 */
export function normalizeMedication(medication) {
  if (!medication || typeof medication !== 'string') {
    return '';
  }
  
  return medication
    .toLowerCase()
    .trim()
    .replace(/[®™©]/g, '') // Remove trademark symbols
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Check if medication matches any allergy
 * @param {string} medication - Medication name
 * @param {Array<string>} allergies - Patient allergies
 * @returns {Object} Match result with details
 */
export function checkMedicationAllergy(medication, allergies) {
  if (!medication || !allergies || allergies.length === 0) {
    return { hasAllergy: false };
  }
  
  const normalizedMed = normalizeMedication(medication);
  const matches = [];
  const crossReactivity = [];
  
  // Check direct matches
  for (const allergy of allergies) {
    // Direct substring match
    if (normalizedMed.includes(allergy) || allergy.includes(normalizedMed)) {
      matches.push({
        allergy,
        matchType: 'direct',
        severity: 'high',
        message: `Coincidencia directa con alergia conocida: ${allergy}`
      });
      continue;
    }
    
    // Check against medication categories
    for (const [category, medications] of Object.entries(MEDICATION_DATABASE)) {
      if (medications.some(med => allergy.includes(med))) {
        // Patient is allergic to this category
        if (medications.some(med => normalizedMed.includes(med))) {
          matches.push({
            allergy,
            matchType: 'category',
            category,
            severity: 'high',
            message: `El medicamento pertenece a la categoría ${category}, a la cual el paciente es alérgico`
          });
        }
      }
    }
  }
  
  // Check cross-reactivity
  for (const allergy of allergies) {
    for (const [allergen, crossReactiveCategories] of Object.entries(CROSS_REACTIVITY)) {
      if (allergy.includes(allergen)) {
        for (const category of crossReactiveCategories) {
          if (MEDICATION_DATABASE[category]) {
            if (MEDICATION_DATABASE[category].some(med => normalizedMed.includes(med))) {
              crossReactivity.push({
                allergy,
                category,
                severity: 'medium',
                message: `Posible reacción cruzada: el paciente es alérgico a ${allergen}, que puede tener reacción cruzada con ${category}`
              });
            }
          }
        }
      }
    }
  }
  
  const hasAllergy = matches.length > 0;
  const hasCrossReactivity = crossReactivity.length > 0;
  const hasAnyWarning = hasAllergy || hasCrossReactivity;
  
  return {
    hasAllergy,
    hasCrossReactivity,
    hasAnyWarning,
    matches,
    crossReactivity,
    severity: hasAllergy ? 'high' : (hasCrossReactivity ? 'medium' : 'none')
  };
}

/**
 * Validate medication against patient allergies
 * @param {string} medication - Medication name
 * @param {Object} patient - Patient object with allergies
 * @returns {Object} Validation result
 */
export function validateMedicationForPatient(medication, patient) {
  if (!patient) {
    return {
      valid: true,
      warning: null
    };
  }
  
  const allergies = parseAllergies(patient.allergies);
  
  if (allergies.length === 0) {
    return {
      valid: true,
      warning: null,
      noAllergies: true
    };
  }
  
  const allergyCheck = checkMedicationAllergy(medication, allergies);
  
  if (!allergyCheck.hasAnyWarning) {
    return {
      valid: true,
      warning: null
    };
  }
  
  return {
    valid: false,
    warning: allergyCheck,
    patientName: patient.name,
    patientAllergies: patient.allergies
  };
}

/**
 * Generate user-friendly alert message
 * @param {Object} validationResult - Result from validateMedicationForPatient
 * @returns {string} Alert message
 */
export function generateAlertMessage(validationResult) {
  if (!validationResult || validationResult.valid) {
    return null;
  }
  
  const { warning, patientName, patientAllergies } = validationResult;
  
  let message = `⚠️ ALERTA DE ALERGIA\n\n`;
  message += `Paciente: ${patientName}\n`;
  message += `Alergias conocidas: ${patientAllergies}\n\n`;
  
  if (warning.hasAllergy) {
    message += `🔴 CONTRAINDICACIÓN ABSOLUTA:\n`;
    warning.matches.forEach((match, idx) => {
      message += `${idx + 1}. ${match.message}\n`;
    });
    message += `\n⛔ NO ADMINISTRAR ESTE MEDICAMENTO\n\n`;
  }
  
  if (warning.hasCrossReactivity) {
    message += `🟡 ADVERTENCIA DE REACCIÓN CRUZADA:\n`;
    warning.crossReactivity.forEach((cross, idx) => {
      message += `${idx + 1}. ${cross.message}\n`;
    });
    message += `\n⚠️ Considerar medicamento alternativo o consultar con médico\n\n`;
  }
  
  return message;
}

/**
 * Get severity color for UI
 * @param {string} severity - 'high', 'medium', 'low', 'none'
 * @returns {Object} Color classes for Tailwind
 */
export function getSeverityColors(severity) {
  const colors = {
    high: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-800',
      icon: 'text-red-600',
      badge: 'bg-red-500',
      gradient: 'from-red-500 to-rose-600',
      alert: 'bg-gradient-to-r from-red-100 via-rose-100 to-red-100'
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-500',
      gradient: 'from-yellow-500 to-amber-600',
      alert: 'bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100'
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-800',
      icon: 'text-blue-600',
      badge: 'bg-blue-500',
      gradient: 'from-blue-500 to-cyan-600',
      alert: 'bg-gradient-to-r from-blue-100 via-cyan-100 to-blue-100'
    },
    none: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-800',
      icon: 'text-green-600',
      badge: 'bg-green-500',
      gradient: 'from-green-500 to-emerald-600',
      alert: 'bg-gradient-to-r from-green-100 via-emerald-100 to-green-100'
    }
  };
  
  return colors[severity] || colors.none;
}

/**
 * Get severity label
 * @param {string} severity - Severity level
 * @returns {string} Human-readable label
 */
export function getSeverityLabel(severity) {
  const labels = {
    high: '🔴 CRÍTICO',
    medium: '🟡 ADVERTENCIA',
    low: '🔵 PRECAUCIÓN',
    none: '✅ SEGURO'
  };
  
  return labels[severity] || labels.none;
}

/**
 * Batch validate multiple medications
 * @param {Array<string>} medications - Array of medication names
 * @param {Object} patient - Patient object
 * @returns {Array<Object>} Array of validation results
 */
export function validateMultipleMedications(medications, patient) {
  if (!medications || medications.length === 0) {
    return [];
  }
  
  return medications.map(medication => ({
    medication,
    validation: validateMedicationForPatient(medication, patient)
  }));
}

/**
 * Get list of safe alternatives (mock data - in real system would be from database)
 * @param {string} allergen - Allergen name
 * @returns {Array<string>} Alternative medications
 */
export function getSafeAlternatives(allergen) {
  const alternatives = {
    penicilina: ['Azitromicina', 'Levofloxacino', 'Clindamicina'],
    aspirina: ['Paracetamol', 'Acetaminofén'],
    ibuprofeno: ['Paracetamol', 'Acetaminofén', 'Celecoxib'],
    morfina: ['Tramadol', 'Fentanilo', 'Oxicodona'],
    sulfamidas: ['Azitromicina', 'Levofloxacino'],
    contraste_yodado: ['Contraste no iónico', 'Gadolinio (MRI)'],
  };
  
  const normalizedAllergen = allergen.toLowerCase().trim();
  
  for (const [key, alts] of Object.entries(alternatives)) {
    if (normalizedAllergen.includes(key)) {
      return alts;
    }
  }
  
  return [];
}

/**
 * Format allergies for display
 * @param {string} allergiesString - Raw allergies string
 * @returns {Array<Object>} Formatted allergy objects
 */
export function formatAllergiesForDisplay(allergiesString) {
  const allergies = parseAllergies(allergiesString);
  
  return allergies.map(allergy => ({
    name: allergy.charAt(0).toUpperCase() + allergy.slice(1),
    severity: 'high', // Default to high - in real system would come from patient data
    alternatives: getSafeAlternatives(allergy)
  }));
}

/**
 * Log allergy alert (for audit trail)
 * @param {Object} validationResult - Validation result
 * @param {string} medicationName - Medication name
 * @param {string} userId - User who attempted prescription
 * @returns {Object} Log entry
 */
export function logAllergyAlert(validationResult, medicationName, userId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    medicationAttempted: medicationName,
    patientId: validationResult.patientName,
    userId,
    allergyDetected: validationResult.warning,
    severity: validationResult.warning?.severity || 'none',
    wasBlocked: !validationResult.valid
  };
  
  console.warn('🚨 ALLERGY ALERT LOGGED:', logEntry);
  
  // In production, this would save to database
  return logEntry;
}

/**
 * Check if override is allowed (for authorized users)
 * @param {Object} user - Current user
 * @returns {boolean} Whether user can override allergy warnings
 */
export function canOverrideAllergyWarning(user) {
  if (!user) return false;
  
  // Only doctors can override (nurses cannot)
  const allowedRoles = ['doctor', 'admin'];
  return allowedRoles.includes(user.role?.toLowerCase());
}
