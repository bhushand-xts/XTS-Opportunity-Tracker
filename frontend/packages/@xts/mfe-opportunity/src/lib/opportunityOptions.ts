export const SERVICE_LINES = [
  'Data & Platform Engineering', 'Artificial Intelligence (AI) & Machine Learning (ML)',
  'Cloud & DevOps', 'Application Development', 'Application Modernization',
  'Quality Assurance & Testing', 'Business Intelligence & Analytics', 'Enterprise Solutions',
  'Cybersecurity', 'IT Consulting & Advisory', 'Managed IT Services', 'Digital Transformation',
  'System Integration & API Development', 'Staff Augmentation', 'Web & Digital', 'Other',
];

// Keep the IDs of existing persisted roles stable.
export const DECISION_ROLE_IDS: Record<string, number> = {
  'Decision Maker': 2, 'Procurement / Buyer': 1, Influencer: 3,
  'Technical Evaluator': 4, 'End User': 5, Approver: 6,
  'Legal/Compliance': 7, Finance: 8, Stakeholder: 9, Other: 10,
};
export const DECISION_ROLES = Object.keys(DECISION_ROLE_IDS);

export const LEAD_SOURCES = [
  { id: '1', label: 'Inbound' },
  { id: '2', label: 'Referral' },
  { id: '3', label: 'Outbound' },
  { id: '4', label: 'Tender portal' },
  { id: '5', label: 'Partner' },
  { id: '6', label: 'RFP / Tender' },
  { id: '7', label: 'Direct enquiry' },
];
