import { ReportStatus } from "../types";

// Single source of truth for the report lifecycle — shared by server and all
// client screens so transitions, labels, and colours can never drift.

export const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  reported:             ["acknowledged", "rejected"],
  acknowledged:         ["in_progress", "rejected"],
  in_review:            ["in_progress", "pending_verification", "rejected"], // legacy
  in_progress:          ["pending_verification", "acknowledged", "rejected"],
  resolved:             ["pending_verification", "acknowledged"],             // legacy → can enter verification
  pending_verification: ["verified", "acknowledged"],                        // community decides
  verified:             [],                                                  // terminal
  rejected:             ["acknowledged"]
};

export function allowedTransitions(from: ReportStatus): ReportStatus[] {
  return TRANSITIONS[from] || [];
}

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return allowedTransitions(from).includes(to);
}

export interface StatusMeta {
  label: string;
  hex: string;
  icon: string;
}

export function statusMeta(status: ReportStatus): StatusMeta {
  switch (status) {
    case "reported":
      return { label: "Reported",             hex: "#ba1a1a", icon: "report_problem" };
    case "acknowledged":
      return { label: "Acknowledged",          hex: "#d97706", icon: "visibility" };
    case "in_review":
      return { label: "In review",             hex: "#d97706", icon: "pending_actions" };
    case "in_progress":
      return { label: "In progress",           hex: "#3c5ca6", icon: "engineering" };
    case "resolved":
      return { label: "Resolved",              hex: "#0e7c5a", icon: "check_circle" };
    case "pending_verification":
      return { label: "Pending verification",  hex: "#3F3AA8", icon: "person_search" };
    case "verified":
      return { label: "Verified",              hex: "#15803D", icon: "verified" };
    case "rejected":
      return { label: "Rejected",              hex: "#6e7a73", icon: "cancel" };
    default:
      return { label: status,                  hex: "#6e7a73", icon: "help" };
  }
}

export function statusChipClass(status: ReportStatus): string {
  switch (status) {
    case "reported":             return "chip-reported";
    case "acknowledged":         return "chip-acknowledged";
    case "in_review":            return "chip-in-review";
    case "in_progress":          return "chip-in-progress";
    case "resolved":             return "chip-resolved";
    case "pending_verification": return "chip-pending-verification";
    case "verified":             return "chip-verified";
    case "rejected":             return "chip-rejected";
    default:                     return "chip-rejected";
  }
}

export function actionLabel(from: ReportStatus, to: ReportStatus): string {
  if (to === "pending_verification") return "Mark resolved";
  if (to === "verified")  return "Confirm verified";
  if (to === "in_progress") return "Start work";
  if (to === "rejected")  return "Reject";
  if (to === "acknowledged") {
    if (from === "reported")  return "Acknowledge";
    if (from === "pending_verification") return "Reopen (disputed)";
    if (from === "resolved" || from === "rejected") return "Reopen";
    return "Send back";
  }
  return to;
}

// 4-step citizen-facing progress bar (Submitted → Acknowledged → In progress → Resolved/Verified)
export const TIMELINE_STEPS = ["Submitted", "Acknowledged", "In progress", "Resolved"];

export function statusStep(status: ReportStatus): number {
  switch (status) {
    case "reported":             return 1;
    case "acknowledged":
    case "in_review":            return 2;
    case "in_progress":          return 3;
    case "resolved":
    case "pending_verification": return 4;
    case "verified":             return 5;
    case "rejected":             return -1;
    default:                     return 1;
  }
}

export const ACTIVE_STATUSES: ReportStatus[] = [
  "reported",
  "acknowledged",
  "in_review",
  "in_progress"
];
