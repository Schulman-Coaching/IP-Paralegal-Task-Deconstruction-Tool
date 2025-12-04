/**
 * IP Form Templates for Patent, Trademark, and Copyright applications
 */

const formTemplates = {
  patent: {
    name: 'Provisional Patent Application',
    description: 'USPTO Provisional Patent Application Form',
    sections: [
      {
        id: 'applicant',
        title: 'Applicant Information',
        fields: [
          { id: 'applicantName', label: 'Applicant Name', type: 'text', required: true },
          { id: 'applicantAddress', label: 'Applicant Address', type: 'textarea', required: true },
          { id: 'applicantPhone', label: 'Phone Number', type: 'tel', required: false },
          { id: 'applicantEmail', label: 'Email Address', type: 'email', required: true }
        ]
      },
      {
        id: 'inventors',
        title: 'Inventor Information',
        repeatable: true,
        fields: [
          { id: 'inventorName', label: 'Inventor Full Name', type: 'text', required: true },
          { id: 'inventorAddress', label: 'Residence Address', type: 'textarea', required: true },
          { id: 'inventorCitizenship', label: 'Citizenship', type: 'text', required: true }
        ]
      },
      {
        id: 'invention',
        title: 'Invention Details',
        fields: [
          { id: 'inventionTitle', label: 'Title of Invention', type: 'text', required: true },
          { id: 'technicalField', label: 'Technical Field', type: 'text', required: true },
          { id: 'description', label: 'Detailed Description', type: 'textarea', required: true, rows: 10 },
          { id: 'claims', label: 'Claims (Optional for Provisional)', type: 'textarea', required: false, rows: 8 },
          { id: 'drawings', label: 'Description of Drawings/Figures', type: 'textarea', required: false, rows: 4 }
        ]
      },
      {
        id: 'priorArt',
        title: 'Prior Art & References',
        fields: [
          { id: 'priorArt', label: 'Known Prior Art', type: 'textarea', required: false, rows: 4 },
          { id: 'advantages', label: 'Advantages Over Prior Art', type: 'textarea', required: false, rows: 4 }
        ]
      },
      {
        id: 'filing',
        title: 'Filing Information',
        fields: [
          { id: 'filingDate', label: 'Target Filing Date', type: 'date', required: false },
          { id: 'priorityClaim', label: 'Priority Claim (if applicable)', type: 'text', required: false },
          { id: 'applicationNumber', label: 'Application Number (if known)', type: 'text', required: false }
        ]
      }
    ]
  },

  trademark: {
    name: 'Trademark Application',
    description: 'USPTO Trademark Application Form (TEAS)',
    sections: [
      {
        id: 'applicant',
        title: 'Applicant Information',
        fields: [
          { id: 'ownerName', label: 'Owner/Applicant Name', type: 'text', required: true },
          { id: 'entityType', label: 'Entity Type', type: 'select', required: true,
            options: ['Individual', 'Corporation', 'LLC', 'Partnership', 'Other'] },
          { id: 'ownerAddress', label: 'Street Address', type: 'textarea', required: true },
          { id: 'ownerCity', label: 'City', type: 'text', required: true },
          { id: 'ownerState', label: 'State/Province', type: 'text', required: true },
          { id: 'ownerCountry', label: 'Country', type: 'text', required: true },
          { id: 'ownerZip', label: 'Postal Code', type: 'text', required: true },
          { id: 'ownerEmail', label: 'Email Address', type: 'email', required: true }
        ]
      },
      {
        id: 'mark',
        title: 'Mark Information',
        fields: [
          { id: 'markName', label: 'Mark (Word/Text)', type: 'text', required: true },
          { id: 'markType', label: 'Mark Type', type: 'select', required: true,
            options: ['Standard Character', 'Special Form (Design)', 'Sound Mark', 'Other'] },
          { id: 'markDescription', label: 'Description of Mark', type: 'textarea', required: true, rows: 4 },
          { id: 'colorClaim', label: 'Color Claim (if applicable)', type: 'text', required: false },
          { id: 'transliteration', label: 'Translation/Transliteration', type: 'text', required: false }
        ]
      },
      {
        id: 'goodsServices',
        title: 'Goods and Services',
        repeatable: true,
        fields: [
          { id: 'internationalClass', label: 'International Class Number', type: 'text', required: true },
          { id: 'goodsServices', label: 'Description of Goods/Services', type: 'textarea', required: true, rows: 4 }
        ]
      },
      {
        id: 'basis',
        title: 'Filing Basis',
        fields: [
          { id: 'filingBasis', label: 'Filing Basis', type: 'select', required: true,
            options: ['Use in Commerce (1a)', 'Intent to Use (1b)', 'Foreign Application (44d)', 'Foreign Registration (44e)'] },
          { id: 'firstUseDate', label: 'Date of First Use Anywhere', type: 'date', required: false },
          { id: 'firstUseInCommerce', label: 'Date of First Use in Commerce', type: 'date', required: false },
          { id: 'specimens', label: 'Specimen Description', type: 'textarea', required: false, rows: 3 }
        ]
      },
      {
        id: 'additional',
        title: 'Additional Information',
        fields: [
          { id: 'existingRegistrations', label: 'Existing Registrations', type: 'textarea', required: false },
          { id: 'disclaimer', label: 'Disclaimer (if applicable)', type: 'text', required: false },
          { id: 'notes', label: 'Additional Notes', type: 'textarea', required: false, rows: 3 }
        ]
      }
    ]
  },

  copyright: {
    name: 'Copyright Registration',
    description: 'U.S. Copyright Office Registration Form',
    sections: [
      {
        id: 'work',
        title: 'Work Information',
        fields: [
          { id: 'workTitle', label: 'Title of Work', type: 'text', required: true },
          { id: 'workType', label: 'Type of Work', type: 'select', required: true,
            options: ['Literary Work', 'Visual Arts', 'Performing Arts', 'Sound Recording', 'Motion Picture/AV', 'Single Serial Issue', 'Computer Software'] },
          { id: 'yearCreated', label: 'Year of Creation', type: 'text', required: true },
          { id: 'yearPublished', label: 'Year of Publication (if published)', type: 'text', required: false },
          { id: 'publicationDate', label: 'Exact Publication Date', type: 'date', required: false },
          { id: 'nation', label: 'Nation of First Publication', type: 'text', required: false }
        ]
      },
      {
        id: 'authors',
        title: 'Author Information',
        repeatable: true,
        fields: [
          { id: 'authorName', label: 'Author Name', type: 'text', required: true },
          { id: 'authorCitizenship', label: 'Citizenship/Domicile', type: 'text', required: true },
          { id: 'workForHire', label: 'Work Made for Hire?', type: 'select', required: true,
            options: ['Yes', 'No'] },
          { id: 'authorBirthYear', label: 'Year of Birth', type: 'text', required: false },
          { id: 'authorDeathYear', label: 'Year of Death (if deceased)', type: 'text', required: false },
          { id: 'natureOfAuthorship', label: 'Nature of Authorship', type: 'textarea', required: true, rows: 3 }
        ]
      },
      {
        id: 'claimant',
        title: 'Copyright Claimant',
        fields: [
          { id: 'claimantName', label: 'Claimant Name', type: 'text', required: true },
          { id: 'claimantAddress', label: 'Claimant Address', type: 'textarea', required: true, rows: 3 },
          { id: 'transferStatement', label: 'Transfer Statement (if different from author)', type: 'textarea', required: false, rows: 2 }
        ]
      },
      {
        id: 'limitation',
        title: 'Limitation of Claim',
        fields: [
          { id: 'preexistingMaterial', label: 'Preexisting Material', type: 'textarea', required: false, rows: 3,
            placeholder: 'Material that this work is based on or incorporates...' },
          { id: 'newMaterial', label: 'New Material Added', type: 'textarea', required: false, rows: 3,
            placeholder: 'New material added in this version...' }
        ]
      },
      {
        id: 'correspondence',
        title: 'Correspondence Information',
        fields: [
          { id: 'contactName', label: 'Contact Name', type: 'text', required: true },
          { id: 'contactEmail', label: 'Email Address', type: 'email', required: true },
          { id: 'contactPhone', label: 'Phone Number', type: 'tel', required: false },
          { id: 'contactAddress', label: 'Mailing Address', type: 'textarea', required: false, rows: 3 }
        ]
      }
    ]
  }
};

module.exports = formTemplates;
