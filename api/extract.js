/**
 * Entity extraction and normalization for IP forms
 */

const FIELD_MAPPINGS = {
  patent: {
    inventionTitle: ['title', 'inventionTitle', 'invention_title', 'name'],
    inventors: ['inventors', 'inventor', 'inventorNames', 'inventor_names'],
    inventorAddress: ['inventorAddress', 'address', 'inventor_address'],
    technicalField: ['technicalField', 'technical_field', 'field', 'technology_area'],
    description: ['description', 'inventionDescription', 'summary', 'abstract'],
    claims: ['claims', 'keyFeatures', 'key_features', 'features'],
    priorArt: ['priorArt', 'prior_art', 'references', 'priorArtReferences'],
    filingDate: ['filingDate', 'filing_date', 'deadline', 'targetDate'],
    drawings: ['drawings', 'figures', 'diagrams', 'illustrations'],
    applicantName: ['applicantName', 'applicant', 'assignee', 'owner'],
    applicationNumber: ['applicationNumber', 'application_number', 'appNumber']
  },
  trademark: {
    markName: ['markName', 'mark_name', 'mark', 'trademark', 'name'],
    markDescription: ['markDescription', 'mark_description', 'description'],
    markType: ['markType', 'mark_type', 'type', 'typeOfMark'],
    ownerName: ['ownerName', 'owner_name', 'applicant', 'owner', 'applicantName'],
    ownerAddress: ['ownerAddress', 'owner_address', 'address', 'applicantAddress'],
    goodsServices: ['goodsServices', 'goods_services', 'goods', 'services', 'goodsAndServices'],
    internationalClass: ['internationalClass', 'international_class', 'class', 'classes', 'niceClass'],
    firstUseDate: ['firstUseDate', 'first_use_date', 'firstUse', 'dateOfFirstUse'],
    firstUseInCommerce: ['firstUseInCommerce', 'first_use_in_commerce', 'commerceDate'],
    specimens: ['specimens', 'specimen', 'specimenDescription'],
    existingRegistrations: ['existingRegistrations', 'existing_registrations', 'priorRegistrations']
  },
  copyright: {
    workTitle: ['workTitle', 'work_title', 'title', 'name'],
    workType: ['workType', 'work_type', 'type', 'typeOfWork', 'category'],
    authorName: ['authorName', 'author_name', 'author', 'authors', 'authorNames'],
    authorCitizenship: ['authorCitizenship', 'author_citizenship', 'citizenship', 'nationality'],
    claimantName: ['claimantName', 'claimant_name', 'claimant', 'copyrightClaimant'],
    claimantAddress: ['claimantAddress', 'claimant_address', 'address'],
    yearCreated: ['yearCreated', 'year_created', 'creationYear', 'yearOfCreation'],
    yearPublished: ['yearPublished', 'year_published', 'publicationYear', 'yearOfPublication'],
    natureOfAuthorship: ['natureOfAuthorship', 'nature_of_authorship', 'authorship', 'authorshipNature'],
    workForHire: ['workForHire', 'work_for_hire', 'madeForHire', 'workMadeForHire'],
    preexistingMaterial: ['preexistingMaterial', 'preexisting_material', 'previousWork'],
    newMaterial: ['newMaterial', 'new_material', 'addedMaterial', 'newContent']
  }
};

function extractEntities(analysisResult, formType = 'patent') {
  const mappings = FIELD_MAPPINGS[formType] || FIELD_MAPPINGS.patent;
  const entities = {};

  for (const [standardField, possibleNames] of Object.entries(mappings)) {
    for (const name of possibleNames) {
      if (analysisResult[name] !== undefined) {
        entities[standardField] = normalizeValue(analysisResult[name], standardField);
        break;
      }
    }
  }

  // Also include any fields from analysis that weren't mapped
  for (const [key, value] of Object.entries(analysisResult)) {
    const isAlreadyMapped = Object.values(mappings).some(names => names.includes(key));
    if (!isAlreadyMapped && value !== undefined) {
      entities[`additional_${key}`] = value;
    }
  }

  return entities;
}

function normalizeValue(value, fieldName) {
  // Handle arrays
  if (Array.isArray(value)) {
    // For certain fields, join array elements
    if (['inventors', 'claims', 'drawings', 'authors'].some(f => fieldName.toLowerCase().includes(f))) {
      return value;
    }
    // For class fields, keep as array
    if (fieldName.toLowerCase().includes('class')) {
      return value;
    }
    return value.join(', ');
  }

  // Handle dates
  if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('year')) {
    return normalizeDateValue(value);
  }

  // Handle boolean-like values
  if (fieldName.toLowerCase().includes('hire')) {
    return normalizeBooleanValue(value);
  }

  return value;
}

function normalizeDateValue(value) {
  if (!value) return null;

  // If it's already a reasonable date string, return it
  if (typeof value === 'string') {
    // Try to parse and format consistently
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    // Return as-is if parsing fails (might be "ongoing", "TBD", etc.)
    return value;
  }

  if (typeof value === 'number') {
    // Assume it's a year
    return value.toString();
  }

  return value;
}

function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (['yes', 'true', '1', 'y'].includes(lower)) return true;
    if (['no', 'false', '0', 'n'].includes(lower)) return false;
  }
  return value;
}

module.exports = { extractEntities, FIELD_MAPPINGS };
