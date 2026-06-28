export type UserRole = "citizen" | "sector_admin" | "super_admin";

export interface UserProfile {
  uid: string;
  userId?: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  joinedAt: any;
  reportsCount: number;
  resolvedCount: number;
  level: number;
  role?: UserRole;
  sectorId?: string;
}

export type ReportStatus =
  | "reported"
  | "acknowledged"
  | "in_review"          // legacy alias
  | "in_progress"
  | "resolved"           // legacy: kept for seed data backward compat
  | "pending_verification"
  | "verified"
  | "rejected";

export interface StatusEvent {
  from: ReportStatus;
  to: ReportStatus;
  note?: string;
  by: string;
  byName?: string;
  at: any;
  hasProof?: boolean;
}

export interface Corroboration {
  uid: string;
  at: string;
}

export interface Verification {
  uid: string;
  confirmedFix: boolean;
  at: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface AnalysisResult {
  issueType: string;
  severity: number;
  description: string;
  confidence: number;
  suggestedCategory: string;
  streetAddress: string;
  lat: number;
  lng: number;
  embeddingVector: number[];
  duplicateCount: number;
  duplicateOf: {
    reportId: string;
    issueType: string;
    status: string;
    streetAddress: string;
  } | null;
  priorityScore: number;
}

export interface Report {
  reportId: string;
  reporterId: string;
  imageBase64: string;
  location: { latitude: number; longitude: number } | any;
  lat?: number;
  lng?: number;
  locationAccuracy: number;
  streetAddress: string;
  locality?: string;
  landmark?: string;
  pincode?: string;
  exactLocation?: string;
  issueType: string;
  severity: number;
  description: string;
  embeddingVector?: number[];
  priorityScore: number;
  duplicateCount: number;
  duplicateOf: string | null;
  status: ReportStatus;
  createdAt: any;
  updatedAt: any;
  categoryWeight?: number;
  resolvedAt?: any;
  stateId?: string;
  sectorId?: string;
  assignedAdminName?: string;
  assignedAdminEmail?: string;
  statusHistory?: StatusEvent[];
  resolutionProof?: string;
  resolutionNote?: string;
  // Community verification
  corroborations?: Corroboration[];
  corroborationCount?: number;
  verifications?: Verification[];
  verificationCount?: number;
  disputeCount?: number;
}

export interface HotspotCluster {
  centroid: { lat: number; lng: number };
  count: number;
  dominantIssueType: string;
  averageSeverity: number;
  colorStatus: "resolved" | "mixed" | "open";
  reportIds: string[];
}
