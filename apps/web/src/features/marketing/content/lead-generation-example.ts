export interface ExampleLeadSource {
  title: string;
  excerpt: string;
  source: string;
}

export interface ExampleLeadData {
  title: string;
  subtitle: string;
  contextLabel: string;
  status: string;
  whyItFitsTitle: string;
  whyItFits: string[];
  evidenceTitle: string;
  evidence: ExampleLeadSource[];
  contactTitle: string;
  contact: string;
  acceptanceReasonTitle: string;
  acceptanceReason: string;
}

export const EXAMPLE_LEAD: ExampleLeadData = {
  title: "Example Dental",
  subtitle: "Dental clinic · Austin, TX",
  contextLabel: "Example lead",
  status: "Accepted",
  whyItFitsTitle: "Why it fits",
  whyItFits: [
    "Dental clinic.",
    "Serves Austin.",
    "Accepts new patients.",
  ],
  evidenceTitle: "Evidence",
  evidence: [
    {
      title: "Appointments",
      excerpt: "We are accepting new patients in Austin.",
      source: "example.com/appointments",
    },
    {
      title: "About the practice",
      excerpt: "Dental care for families in Austin.",
      source: "example.com/about",
    },
  ],
  contactTitle: "Contact",
  contact: "Business contact available.",
  acceptanceReasonTitle: "Acceptance reason",
  acceptanceReason:
    "Matches the selected business category and location, with evidence that new patients are welcome.",
};
