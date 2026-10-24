import { FileText } from "lucide-react";
import { KNOWLEDGE_EXAMPLE } from "./content";

export function SourceDocument({ kind, emphasized = false }: {
  kind: "booking" | "services";
  emphasized?: boolean;
}) {
  const source = KNOWLEDGE_EXAMPLE[kind];
  return (
    <article
      id={`knowledge-source-${kind}`}
      aria-labelledby={`knowledge-source-${kind}-title`}
      className={`marketing-knowledge-document marketing-knowledge-document-${kind}${emphasized ? " marketing-knowledge-document-emphasized" : ""}`}
    >
      <header className="marketing-knowledge-document-header">
        <FileText size={21} strokeWidth={1.5} aria-hidden="true" />
        <h3 id={`knowledge-source-${kind}-title`}>{source.title}</h3>
        <span className="marketing-knowledge-format">{source.format}</span>
      </header>
      <h4>{source.heading}</h4>
      {kind === "booking" ? (
        <p>{KNOWLEDGE_EXAMPLE.booking.before}<mark>{KNOWLEDGE_EXAMPLE.booking.highlight}</mark>{KNOWLEDGE_EXAMPLE.booking.after}</p>
      ) : (
        <>
          <p>{KNOWLEDGE_EXAMPLE.services.description}</p>
          <div className="marketing-knowledge-service-rows">
            {KNOWLEDGE_EXAMPLE.services.rows.map(row => (
              <div key={row}><span>{row}</span><i aria-hidden="true" /></div>
            ))}
          </div>
        </>
      )}
      <div className="marketing-knowledge-document-lines" aria-hidden="true"><i /><i /></div>
    </article>
  );
}
