

const ROLE_ID = "GCMS_LAB_SPECIALIST";
const MIN_POSITIVE_GROUPS_REQUIRED = 2;

const SCORE_S = 80;
const SCORE_A = 65;
const SCORE_B = 55;

const GROUP_WEIGHTS = {
  gc_core: 30,
  advanced_instruments: 20,
  qc_environment: 15,
  method_dev_val: 20,
  sample_prep: 10,
  documentation: 5,
  education: 10
};

const EXPERIENCE_BONUS_CONFIG = [
{ min: 0,    max: 0.9,  level: "ENTRY",          bonus: 1 },
  { min: 1,    max: 1.9,  level: "JUNIOR_1_2", bonus: 3 },
  { min: 2,    max: 3.9,  level: "JUNIOR_2_3", bonus: 6 },
  { min: 4,    max: 6.9,  level: "MID_4_6",    bonus: 10 },
  { min: 7,    max: 9.9,  level: "SENIOR_7_9", bonus: 13 },
  { min: 10,   max: 50,   level: "EXPERT_10_PLUS", bonus: 15 }
];

const POSITIVE_GROUPS = {
  gc_core: [
    "gas chromatography",
    "gc-ms",
    "gcms",
    "gc ms",
    "gc ms/ms",
    "gc-ms/ms",
    "gc ",
  ],
  advanced_instruments: [
    "hplc",
    "uplc",
    "uhplc",
    "lc-ms",
    "lcms",
    "lc ms",
    "liquid chromatography",
    "mass spectrometry",
    "ms/ms"
  ],
  qc_environment: [
    "quality control laboratory",
    "quality control lab",
    "qc laboratory",
    "qc lab",
    "qc environment",
    "pharmaceutical industry",
    "pharma qc",
    "gmp",
    "glp",
    "regulated environment",
    "good laboratory practice"
  ],
  method_dev_val: [
    "method development",
    "method validation",
    "method transfer",
    "stability study",
    "stability studies",
    "robustness",
    "linearity",
    "accuracy",
    "precision",
    "limit of detection",
    "limit of quantification"
  ],
  sample_prep: [
    "sample preparation",
    "sample prep",
    "extraction",
    "solid phase extraction",
    "spe",
    "liquid-liquid extraction",
    "calibration curve",
    "standard preparation",
    "standard prep"
  ],
  documentation: [
    "sop",
    "standard operating procedure",
    "lab documentation",
    "laboratory documentation",
    "deviation report",
    "deviation reports",
    "oos",
    "out of specification",
    "investigation report",
    "change control",
    "audit"
  ],
  education: [
    "bsc chemistry",
    "b.sc chemistry",
    "bachelor of science in chemistry",
    "msc chemistry",
    "m.sc chemistry",
    "master of science in chemistry",
    "analytical chemistry",
    "pharmaceutical chemistry",
    "chemical engineering"
  ]
};

/**
 * Normalize text for pattern matching
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if text contains any of the patterns
 * @param {string} text - normalized text
 * @param {string[]} patterns
 * @returns {{matched: boolean, hits: string[]}}
 */
function findMatches(text, patterns) {
  const hits = [];
  for (const pattern of patterns) {
    const p = pattern.toLowerCase();
    if (text.includes(p)) {
      hits.push(pattern);
    }
  }
  return { matched: hits.length > 0, hits };
}


function estimateYearsOfExperience(text) {
  let maxYears = null;

  // 1) Patterns like "X+ years of experience", "X years experience", "X yrs experience"
  const regexYears = /(\d+)\s*\+?\s*(?:years|year|yrs|yr)\s+(?:of\s+)?experience/g;
  let match;
  while ((match = regexYears.exec(text)) !== null) {
    const years = parseInt(match[1], 10);
    if (!isNaN(years)) {
      if (maxYears === null || years > maxYears) {
        maxYears = years;
      }
    }
  }

  // 2) Patterns like "X+ years in qc lab", "X-year experience" etc.
  const regexYearsLoose = /(\d+)\s*\+?\s*(?:years|year|yrs|yr)\b/g;
  while ((match = regexYearsLoose.exec(text)) !== null) {
    const years = parseInt(match[1], 10);
    if (!isNaN(years)) {
      if (maxYears === null || years > maxYears) {
        maxYears = years;
      }
    }
  }


  if (maxYears === null) {
    if (
      text.includes("entry level") ||
      text.includes("entry-level") ||
      text.includes("entrylevel") ||
      text.includes("fresher") ||
      text.includes("graduate trainee")
    ) {
      return 0; 
    }
  }

  if (maxYears === null) {
    if (
      text.includes("one year") ||
      text.includes("one year experience") ||
      text.includes("two years") ||
      text.includes("two years experience") ||
      text.includes("three years") ||
      text.includes("three years experience") ||
      text.includes("four years") ||
      text.includes("four years experience") ||
      text.includes("five years") ||
      text.includes("five years experience") 
    ) {
      return 1; 
    }
  }
  return maxYears;
}

function getExperienceLevelAndBonus(years) {
  if (years === null || isNaN(years)) {
    return {
      years: null,
      level: "UNKNOWN",
      bonus: 0
    };
  }

  for (const cfg of EXPERIENCE_BONUS_CONFIG) {
    if (years >= cfg.min && years <= cfg.max) {
      return {
        years,
        level: cfg.level,
        bonus: cfg.bonus
      };
    }
  }

  // Fallback (very large or weird numbers)
  return {
    years,
    level: "EXPERT_10_PLUS",
    bonus: 15
  };
}

/**
 * Evaluate CV text for GCMS Lab Specialist role
 * @param {string} rawText
 * @returns {{
 *   role_id: string,
 *   score: number,
 *   decision: "YES" | "NO",
 *   rank: string,
 *   positiveGroupsHit: number,
 *   minPositiveGroupsRequired: number,
 *   matchedGroups: string[],
 *   matchedKeywords: Record<string, string[]>,
 *   reason: string,
 *   yearsOfExperience: number | null,
 *   experienceLevel: string,
 *   experienceBonus: number
 * }}
 */
function evaluateLabCV(rawText) {
  const normalizedText = normalizeText(rawText);

  if (!normalizedText) {
    return {
      role_id: ROLE_ID,
      score: 0,
      decision: "NO",
      rank: "REJECT_EMPTY",
      positiveGroupsHit: 0,
      minPositiveGroupsRequired: MIN_POSITIVE_GROUPS_REQUIRED,
      matchedGroups: [],
      matchedKeywords: {},
      reason: "Empty or invalid CV text.",
      yearsOfExperience: null,
      experienceLevel: "UNKNOWN",
      experienceBonus: 0
    };
  }

  // ---- Phase 0: Experience extraction ----
  const years = estimateYearsOfExperience(normalizedText);
  const { level: experienceLevel, bonus: experienceBonus } = getExperienceLevelAndBonus(years);

  // ---- Phase 1: Group matching ----
  const matchedKeywords = {};
  const matchedGroups = [];
  const groupHitFlags = {};

  for (const [groupId, patterns] of Object.entries(POSITIVE_GROUPS)) {
    const { matched, hits } = findMatches(normalizedText, patterns);
    groupHitFlags[groupId] = matched;

    if (matched) {
      matchedGroups.push(groupId);
      matchedKeywords[groupId] = hits;
    }
  }

  const positiveGroupsHit = matchedGroups.length;

  // ---- Gate 1: Core GCMS requirement ----
  const hasGCCore = !!groupHitFlags.gc_core;
  const hasAdvancedOrQCOrMethod =
    !!groupHitFlags.advanced_instruments ||
    !!groupHitFlags.qc_environment ||
    !!groupHitFlags.method_dev_val;

  if (!hasGCCore || !hasAdvancedOrQCOrMethod) {
    return {
      role_id: ROLE_ID,
      score: 0,
      decision: "NO",
      rank: "REJECT_NO_CORE_GCMS",
      positiveGroupsHit,
      minPositiveGroupsRequired: MIN_POSITIVE_GROUPS_REQUIRED,
      matchedGroups,
      matchedKeywords,
      reason:
        "Rejected: No clear combination of GC/GC-MS experience with advanced instruments, QC environment, or method validation.",
      yearsOfExperience: years,
      experienceLevel,
      experienceBonus
    };
  }

  // ---- Gate 2: Minimum number of positive groups ----
  if (positiveGroupsHit < MIN_POSITIVE_GROUPS_REQUIRED) {
    return {
      role_id: ROLE_ID,
      score: 0,
      decision: "NO",
      rank: "REJECT_TOO_WEAK",
      positiveGroupsHit,
      minPositiveGroupsRequired: MIN_POSITIVE_GROUPS_REQUIRED,
      matchedGroups,
      matchedKeywords,
      reason: `Rejected: Only ${positiveGroupsHit} GCMS-related group(s) found. Need at least ${MIN_POSITIVE_GROUPS_REQUIRED}.`,
      yearsOfExperience: years,
      experienceLevel,
      experienceBonus
    };
  }

  // ---- Phase 2: Scoring ----
  let baseScore = 0;

  for (const [groupId, weight] of Object.entries(GROUP_WEIGHTS)) {
    if (groupHitFlags[groupId]) {
      baseScore += weight;
    }
  }

  // Cap base score (e.g. 80)
  baseScore = Math.min(baseScore, 80);

  // Bonus points (method & instrumentation logic)
  let bonus = 0;

  // GC + HPLC/LC-MS combo
  if (groupHitFlags.gc_core && groupHitFlags.advanced_instruments) {
    bonus += 5;
  }

  // Method dev/val + QC environment combo
  if (groupHitFlags.method_dev_val && groupHitFlags.qc_environment) {
    bonus += 5;
  }

  // Chemistry education + instruments
  if (
    groupHitFlags.education &&
    (groupHitFlags.gc_core || groupHitFlags.advanced_instruments)
  ) {
    bonus += 5;
  }

  // Extra strong validation terms
  if (
    groupHitFlags.method_dev_val &&
    (normalizedText.includes("stability study") ||
      normalizedText.includes("stability studies"))
  ) {
    bonus += 5;
  }

  // Cap "technical" bonus (without experience) at 20
  bonus = Math.min(bonus, 20);

  const technicalScore = Math.min(100, baseScore + bonus);

  // ---- Phase 2.5: Add experience bonus (max ~15) ----
  const finalScore = Math.min(100, technicalScore + experienceBonus);

  // ---- Phase 3: Decision & rank ----
  let decision = "NO";
  let rank = "REJECT";

  if (finalScore >= SCORE_S && positiveGroupsHit >= 3) {
    decision = "YES";
    rank = "S"; 
  } else if (finalScore >= SCORE_A && positiveGroupsHit >= 3) {
    decision = "YES";
    rank = "A"; 
  } else if (finalScore >= SCORE_B && positiveGroupsHit >= 2) {
    decision = "YES";
    rank = "B"; 
  } else {
    decision = "NO";
    rank = "REJECT";
  }

  let reason;
  if (decision === "YES") {
    reason = `Passed GCMS lab screening with rank ${rank}. Score ${finalScore}. Found ${positiveGroupsHit} positive GCMS-related groups: ${matchedGroups.join(
      ", "
    )}. Experience level: ${experienceLevel}${
      years != null ? ` (~${years} year(s))` : ""
    }.`;
  } else {
    reason = `Rejected: Score ${finalScore} with ${positiveGroupsHit} positive GCMS-related group(s). Experience level: ${experienceLevel}${
      years != null ? ` (~${years} year(s))` : ""
    }. Below required thresholds for GCMS lab specialist.`;
  }

  return {
    role_id: ROLE_ID,
    score: finalScore,
    decision,
    rank,
    positiveGroupsHit,
    minPositiveGroupsRequired: MIN_POSITIVE_GROUPS_REQUIRED,
    matchedGroups,
    matchedKeywords,
    reason,
    yearsOfExperience: years,
    experienceLevel,
    experienceBonus
  };
}

module.exports = { evaluateLabCV };
