export const KNOWLEDGE_EXAMPLE = {
  question: "Can I move my cleaning appointment?",
  memory: "Alex prefers email.",
  booking: {
    title: "Booking policy",
    format: "PDF",
    heading: "Rescheduling",
    before: "Appointments can be rescheduled with at least ",
    highlight: "24 hours’ notice",
    after: ".",
  },
  services: {
    title: "Services & pricing",
    format: "MD",
    heading: "Home cleaning",
    description: "Weekly and one-off appointments.",
    rows: ["Standard clean", "Deep clean"],
  },
} as const;
