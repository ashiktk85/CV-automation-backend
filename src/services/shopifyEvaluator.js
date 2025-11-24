/**
 * Shopify CV Scoring and Ranking System
 * Evaluates CVs based on Shopify experience and technical skills
 */

// Shopify Experience Skills with keyword patterns
const SHOPIFY_EXPERIENCE_SKILLS = {
  shopify_store_setup: [
    'created a shopify website',
    'shopify store setup',
    'shopify website setup',
    'shopify store creation',
    'build shopify website'
  ],
  shopify_management: [
    'managed shopify store',
    'shopify store management',
    'shopify store maintenance',
    'e-commerce website management'
  ],
  shopify_product_listing: [
    'shopify product listing',
    'product listing',
    'catalog optimization',
    'product uploads'
  ],
  shopify_seo: [
    'shopify seo',
    'seo optimization',
    'on-page seo',
    'website optimization'
  ],
  shopify_analytics: [
    'performance analysis',
    'performance tracking',
    'conversion tracking',
    'shopify analytics'
  ],
  shopify_marketing: [
    'meta ads',
    'facebook ads',
    'instagram ads',
    'google ads',
    'shopping ads',
    'conversion campaigns',
    'remarketing',
    'retargeting'
  ]
};

// Technical Shopify Skills with keyword patterns
const TECHNICAL_SKILLS = {
  shopify_liquid: [
    'shopify liquid',
    'liquid templating',
    'liquid template',
    'liquid code'
  ],
  theme_customization: [
    'custom shopify theme',
    'theme customization',
    'custom sections',
    'custom blocks',
    'dynamic sections',
    'theme architecture'
  ],
  os2: [
    'online store 2.0',
    'shopify 2.0',
    'os 2.0'
  ],
  metafields: [
    'shopify metafields',
    'metafields',
    'dynamic content'
  ],
  json_templates: [
    'json templates',
    'json template'
  ],
  html_css: [
    'html5',
    'css3',
    'html',
    'css'
  ],
  javascript: [
    'javascript',
    'es6',
    'ecmascript 6',
    'vanilla js'
  ],
  ajax_jquery: [
    'ajax',
    'jquery'
  ]
};

/**
 * Normalizes text for pattern matching
 * @param {string} text - Raw text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Checks if any pattern in a skill matches the text
 * @param {string} text - Normalized text
 * @param {string[]} patterns - Array of patterns to match
 * @returns {boolean}
 */
function matchesPattern(text, patterns) {
  return patterns.some(pattern => text.includes(pattern.toLowerCase()));
}

/**
 * Evaluates a CV for Shopify developer position
 * @param {string} rawText - Extracted text from PDF
 * @returns {Object} - Scoring results
 */
function evaluateShopifyCV(rawText) {
  const normalizedText = normalizeText(rawText);
  
  // Phase 1: Shopify Experience Gate
  const matchedExperience = [];
  let shopifyExperienceMatches = 0;
  
  for (const [skillId, patterns] of Object.entries(SHOPIFY_EXPERIENCE_SKILLS)) {
    if (matchesPattern(normalizedText, patterns)) {
      matchedExperience.push(skillId);
      shopifyExperienceMatches++;
    }
  }
  
  // Gate check: Need at least 2 distinct Shopify experience skills
  if (shopifyExperienceMatches < 2) {
    return {
      decision: 'NO',
      score: 0,
      rank: 'REJECT_NO_SHOPIFY_EXP',
      shopifyExperienceMatches,
      technicalMatches: 0,
      hasLiquid: false,
      matchedExperience,
      matchedTechnicalSkills: [],
      reason: 'Not enough Shopify experience (need at least 2 distinct Shopify responsibilities).'
    };
  }
  
  // Base score of 50 for passing the experience gate
  let baseScore = 50;
  
  // Phase 2: Technical Shopify Skills + Ranking
  const matchedTechnicalSkills = [];
  let technicalMatches = 0;
  let hasLiquid = false;
  
  for (const [skillId, patterns] of Object.entries(TECHNICAL_SKILLS)) {
    if (matchesPattern(normalizedText, patterns)) {
      matchedTechnicalSkills.push(skillId);
      technicalMatches++;
      
      if (skillId === 'shopify_liquid') {
        hasLiquid = true;
      }
    }
  }
  
  // Liquid is mandatory
  if (!hasLiquid) {
    return {
      decision: 'NO',
      score: baseScore,
      rank: 'REJECT_NO_LIQUID',
      shopifyExperienceMatches,
      technicalMatches,
      hasLiquid: false,
      matchedExperience,
      matchedTechnicalSkills,
      reason: 'Missing Shopify Liquid (mandatory skill).'
    };
  }
  
  // Calculate technical score (max 50 points)
  const technicalScore = Math.min(technicalMatches * 10, 50);
  const finalScore = Math.min(100, baseScore + technicalScore);
  
  // Determine rank based on score and technical matches
  let rank;
  if (finalScore >= 85 && technicalMatches >= 4) {
    rank = 'S'; // Strong dev
  } else if (finalScore >= 70 && technicalMatches >= 3) {
    rank = 'A'; // Solid dev
  } else if (finalScore >= 55 && technicalMatches >= 2) {
    rank = 'B'; // Mid / okay
  } else if (finalScore >= 50 && technicalMatches >= 1) {
    rank = 'C'; // Minimum pass
  } else {
    rank = 'REJECT';
  }
  
  // Decision based on rank
  const decision = (rank === 'S' || rank === 'A' || rank === 'B' || rank === 'C') ? 'YES' : 'NO';
  
  // Generate reason
  let reason = '';
  if (decision === 'YES') {
    reason = `Passed evaluation with rank ${rank}. Found ${shopifyExperienceMatches} Shopify experience skills and ${technicalMatches} technical skills including Liquid.`;
  } else {
    reason = `Did not meet minimum requirements. Score: ${finalScore}, Technical matches: ${technicalMatches}.`;
  }
  
  return {
    decision,
    score: finalScore,
    rank,
    shopifyExperienceMatches,
    technicalMatches,
    hasLiquid,
    matchedExperience,
    matchedTechnicalSkills,
    reason
  };
}

module.exports = { evaluateShopifyCV };

