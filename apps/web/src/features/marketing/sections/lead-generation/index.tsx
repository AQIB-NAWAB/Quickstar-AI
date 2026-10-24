import Image from "next/image";
import "../../styles/lead-generation.css";

const stages = ["Set your criteria", "Review the match", "Keep the sources"];

export function LeadGenerationSection() {
  return (
    <section id="lead-generation" aria-labelledby="lead-generation-heading" className="lead-research-section">
      <div className="lead-research-container">
        <div className="lead-research-copy">
          <header className="lead-research-header">
            <p className="lead-research-eyebrow">LEAD GENERATION</p>
            <h2 id="lead-generation-heading" className="lead-research-heading">Find the right business.<br /><em>Know why it fits.</em></h2>
            <p className="lead-research-description">Find businesses that fit your criteria, with clear reasons and sources behind each match.</p>
          </header>
          <ol className="lead-research-stages" aria-label="Business research process">
            {stages.map((stage, index) => <li key={stage}><span aria-hidden="true">0{index + 1}</span><h3>{stage}</h3></li>)}
          </ol>
        </div>
        <figure className="lead-research-stage">
          <Image src="/marketing/lead-generation/business-research-workstation.webp" alt="Illustrative business search across offices, shops, and service businesses. Northstar Studio matches the industry, location, and business-need criteria, with a company website excerpt supporting the match." width={1254} height={1254} quality={95} sizes="(max-width: 767px) 94vw, (min-width: 1240px) 670px, 55vw" />
        </figure>
      </div>
    </section>
  );
}
