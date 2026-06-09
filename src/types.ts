export enum ChatTone {
  PROFESSIONAL = "Professional",
  PLAYFUL = "Playful",
  EMPATHETIC = "Empathetic",
  DIRECT = "Direct",
  ACADEMIC = "Academic",
  PERSUASIVE = "Persuasive"
}

export interface BotConfig {
  businessName: string;
  industry: string;
  tone: ChatTone;
  faqs: FAQItem[];
  leadCaptureActive: boolean;
  onboardingCompleted: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface CapturedLead {
  id: string;
  name: string;
  email: string;
  capturedAt: string;
  sourceBot: string;
  initialMessage?: string;
}

export interface AuditReport {
  id: string;
  url: string;
  scannedAt: string;
  scores: {
    pageSpeed: number; // 0-100
    mobileResponsiveness: number; // 0-100
    seoRank: number; // 0-100
    complianceScore: number; // 0-100
  };
  checks: {
    pageSpeedSeconds: number;
    metaTagsPresent: boolean;
    brokenLinksCount: number;
    contactFormPresent: boolean;
    googleBusinessSchema: boolean;
    hasProperSitemap: boolean;
  };
  aiRecommendation: string;
  aiDetailedAdvice?: string;
}

export interface ConsultationLead {
  id: string;
  name: string;
  email: string;
  website: string;
  notes?: string;
  requestedAt: string;
  status: "new" | "contacted" | "completed";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
}
