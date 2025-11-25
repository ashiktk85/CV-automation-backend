
const SHOPIFY_EXPERIENCE_SKILLS = {
  shopify_store_build: [
    'shopify developer',
    'senior shopify developer',
    'shopify development',
    'shopify store',
    'shopify stores',
    'shopify theme',
    'shopify themes',
    'shopify app',
    'shopify apps',
    'custom shopify sections',
    'shopify sections',
    'shopify templates',
    'shopify checkout',
    'custom shopify features',
    'themes',
    'shopify'
  ],


  shopify_management: [
    'managed shopify store',
    'shopify store management',
    'shopify store maintenance',
    'shopify maintenance',
    'store maintenance',
    'store management',
    'a/b testing',
    'a/b experiments'
  ],


  shopify_product_listing: [
    'shopify product listing',
    'product listing',
    'product uploads',
    'catalog optimization',
    'collection setup'
  ],


  shopify_seo: [
    'shopify seo',
    'seo optimization',
    'on-page seo',
    'website optimization',
    'core web vitals',
    'page speed optimization',
    'performance optimization',
    'performance improvements'
  ],


  shopify_analytics: [
    'performance analysis',
    'performance tracking',
    'conversion tracking',
    'conversion rate optimization',
    'shopify analytics',
    'google analytics'
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
  ],


  shopify_migrations: [
    'migrated stores from woocommerce to shopify',
    'migration to shopify',
    'migrated to shopify',
    'shopify migration'
  ]
};


const TECHNICAL_SKILLS = {
  shopify_liquid: [
    'shopify liquid',
    'liquid templating',
    'liquid template',
    'liquid code',
    'liquid'
  ],
  theme_customization: [
    'custom shopify theme',
    'theme customization',
    'custom sections',
    'custom blocks',
    'dynamic sections',
    'theme architecture',
    'liquid inheritance',
    'liquid macros',
    'liquid partials',
    'liquid sections',
    'liquid snippets',
    'liquid templates',
    'liquid themes',
    'liquid widgets',
    'liquid components',
    'liquid plugins',
    'liquid extensions',
    'liquid apps',
    'liquid themes',
    'liquid widgets',
    'liquid components',
    'liquid plugins',
    'liquid extensions',
    'theme development',
    'theme design',
    'theme implementation',
    'theme customization',
    'theme development',
    'theme design',
    'theme edit',
    'theme editing'
  
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


function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}


function matchesPattern(text, patterns) {
  return patterns.some(pattern => text.includes(pattern.toLowerCase()));
}


function evaluateShopifyCV(rawText) {
  const normalizedText = normalizeText(rawText);
  
  const matchedExperience = [];
  let shopifyExperienceMatches = 0;
  
  for (const [skillId, patterns] of Object.entries(SHOPIFY_EXPERIENCE_SKILLS)) {
    if (matchesPattern(normalizedText, patterns)) {
      matchedExperience.push(skillId);
      shopifyExperienceMatches++;
    }
  }
  
  if (shopifyExperienceMatches < 2) {
    return {
      score: 0,
      rank: 'REJECT_NO_SHOPIFY_EXP',
      shopifyExperienceMatches,
      technicalMatches: 0,
      matchedExperience,
      matchedTechnicalSkills: [],
      reason: 'Not enough Shopify experience (need at least 2 distinct Shopify responsibilities).'
    };
  }
  
  const matchedTechnicalSkills = [];
  let technicalMatches = 0;
  
  for (const [skillId, patterns] of Object.entries(TECHNICAL_SKILLS)) {
    if (matchesPattern(normalizedText, patterns)) {
      matchedTechnicalSkills.push(skillId);
      technicalMatches++;
    }
  }

  let finalScore = 0;
  
  if (shopifyExperienceMatches >= 3) {
    const baseScore = 50;
    const technicalBonus = Math.min(technicalMatches * 10, 50);
    finalScore = Math.min(100, baseScore + technicalBonus);
  } else {
    finalScore = Math.min(49, technicalMatches * 10);
  }

  let rank;
  if (finalScore >= 85 && shopifyExperienceMatches >= 3) {
    rank = 'S'; 
  } else if (finalScore >= 70 && shopifyExperienceMatches >= 3) {
    rank = 'A'; 
  } else if (finalScore >= 55 && shopifyExperienceMatches >= 3) {
    rank = 'B'; 
  } else if (finalScore >= 50 && shopifyExperienceMatches >= 3) {
    rank = 'C'; 
  } else {
    rank = 'REJECT'; 
  }
  
  let reason = '';
  if (finalScore >= 50 && shopifyExperienceMatches >= 3) {
    reason = `Passed evaluation with rank ${rank}. Found ${shopifyExperienceMatches} Shopify experience skills and ${technicalMatches} technical skills.`;
  } else if (shopifyExperienceMatches < 3) {
    reason = `Rejected: Need at least 3 Shopify experience skills to achieve 50 points. Found ${shopifyExperienceMatches} Shopify experience skills.`;
  } else {
    reason = `Rejected: Score ${finalScore} is below the minimum threshold of 50.`;
  }
  
  return {
    score: finalScore,
    rank,
    shopifyExperienceMatches,
    technicalMatches,
    matchedExperience,
    matchedTechnicalSkills,
    reason
  };
}

module.exports = { evaluateShopifyCV };

