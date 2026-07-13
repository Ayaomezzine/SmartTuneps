export type ConsultationLanguage = 'Arabic' | 'French' | 'Bilingual';
export type ConsultationUrgency = 'urgent' | 'soon' | 'normal';

export interface Consultation {
  id: string;
  consultationNumber: string;
  originalTitle: string;
  translatedTitle: string;
  organization: string;
  publicationDate: string;
  deadline: string;
  language: ConsultationLanguage;
  category: string;
  matchScore: number;
  confidenceScore: number;
  matchingProducts: string[];
  matchingCategories: string[];
  urgency: ConsultationUrgency;
  aiSummary: string;
  productsRequested: string[];
  lots: string[];
  technicalSpecifications: string[];
  estimatedOpportunity: string;
  potentialCompetitors: string[];
  directLink: string;
  reason: string;
  sourceTitle: string;
  remainingDaysBeforeDeadline: number;
  documents: Array<{
    id: string;
    fileName: string;
    url: string;
  }>;
}

export interface BusinessProfile {
  companyName: string;
  businessSector: string;
  vatNumber?: string;
  address: string;
  phone: string;
  email: string;
  products: string[];
  customProducts: string;
}
