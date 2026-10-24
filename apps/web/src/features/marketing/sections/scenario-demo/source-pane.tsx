import { CalendarDays, FileText, Users } from "lucide-react";
import type { ScenarioDefinition, SourceSnippet } from "../../content/demo-scenarios";

export function SourcePane({ scenario, selectedSource }: { scenario: ScenarioDefinition; selectedSource: SourceSnippet | null }) {
  const appointment = scenario.messages.find(message => message.appointment)?.appointment;
  const lead = scenario.messages.find(message => message.lead)?.lead;
  const source = selectedSource ?? scenario.messages.flatMap(message => message.sources ?? [])[0];
  const title = appointment ? "Appointment details" : lead ? "Lead details" : source?.title ?? "Refund policy";
  const Icon = appointment ? CalendarDays : lead ? Users : FileText;
  const details = appointment ? [["Name", appointment.name], ["Service", appointment.service], ["Date", appointment.date], ["Time", appointment.time]] : lead ? [["Business", lead.business], ["Need", lead.need], ["Weekly enquiries", lead.weeklyEnquiries], ["Timeline", lead.timeline]] : [];
  return (
    <aside className="demo-source-pane" aria-label={title}>
      <header className="demo-source-header"><Icon size={24} aria-hidden="true" /><div><h3>{title}</h3><p>{source ? "Source used for this answer" : "Prepared from the conversation"}</p></div></header>
      <div className="demo-source-document" aria-live="polite">
        {source ? <>
          <div className="demo-document-lines" aria-hidden="true"><i /><i /><i /><i /></div>
          <blockquote className="demo-source-excerpt">{source.id === "source-1" ? <>Refunds are available within <strong>30 days</strong> of purchase.</> : source.snippet.replace(/[“”]/g, "")}</blockquote>
          <div className="demo-document-lines demo-document-lines-bottom" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div>
        </> : <><span className="demo-record-status">{appointment?.status ?? lead?.status}</span><dl className="demo-record-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="demo-record-note">Illustrative example</p></>}
      </div>
    </aside>
  );
}
