export function SocialProof() {
  const partners = [
    { name: "OpenAI", label: "OPENAI" },
    { name: "Anthropic", label: "ANTHROPIC" },
    { name: "Twilio", label: "TWILIO" },
    { name: "AWS", label: "AWS CLOUD" },
    { name: "PostgreSQL", label: "POSTGRESQL" },
    { name: "Apache Kafka", label: "APACHE KAFKA" },
    { name: "OpenSearch", label: "OPENSEARCH" },
    { name: "Valkey", label: "VALKEY REDIS" },
  ];

  return (
    <section className="py-12 border-y border-border-faint bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-8">
          Engineered on modern AI &amp; distributed cloud infrastructure
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center justify-center">
          {partners.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-center h-10 px-3 rounded-8 border border-transparent hover:border-border-faint hover:bg-white transition-all text-neutral-600 hover:text-accent-black"
            >
              <span className="font-mono text-xs font-bold tracking-wider opacity-80 hover:opacity-100 transition-opacity">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
