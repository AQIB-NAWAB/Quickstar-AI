import type { CrmMapping, LeadRecord } from "@quickstart/contracts";
import type { CrmDestinationAdapter, CrmPushResult } from "./adapter.js";

export class SalesforceAdapter implements CrmDestinationAdapter {
  readonly name = "salesforce";

  private getCredentials(credentials: Record<string, unknown>): { instanceUrl: string; token: string } {
    const instanceUrl = (credentials.instanceUrl as string) || (credentials.instance_url as string);
    const token =
      (credentials.accessToken as string) ||
      (credentials.token as string) ||
      (credentials.access_token as string);

    if (!instanceUrl || typeof instanceUrl !== "string" || !instanceUrl.startsWith("http")) {
      throw new Error("SALESFORCE_CONFIG_ERROR: Valid Salesforce instance URL must be provided.");
    }
    if (!token || typeof token !== "string" || token.length < 10) {
      throw new Error("SALESFORCE_AUTHENTICATION_REQUIRED: Valid Salesforce access token must be provided.");
    }
    return { instanceUrl: instanceUrl.replace(/\/+$/, ""), token };
  }

  async testConnection(credentials: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
    try {
      const { instanceUrl, token } = this.getCredentials(credentials);
      const res = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Lead/describe`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        return { ok: true, message: "Salesforce connection verified." };
      }
      return { ok: false, message: `Salesforce returned HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Failed to connect to Salesforce." };
    }
  }

  async pushLead(
    lead: LeadRecord | any,
    credentials: Record<string, unknown>,
    existingMapping?: CrmMapping | null,
    options: { preserveConflicts?: boolean } = { preserveConflicts: true },
  ): Promise<CrmPushResult> {
    const { instanceUrl, token } = this.getCredentials(credentials);
    const data = lead.data || lead;

    const email = lead.email || lead.contact_email || data.email || null;
    const phone = lead.phone || lead.contact_phone || data.phone || null;
    const company = data.company_name || data.company || "Independent";
    const website = lead.domain || data.website || null;
    const personName = lead.person_name || data.person_name || null;

    let firstName = "Prospective";
    let lastName = "Contact";
    if (personName && typeof personName === "string") {
      const parts = personName.trim().split(/\s+/);
      firstName = parts[0] || "Prospective";
      lastName = parts.slice(1).join(" ") || "Contact";
    }

    const targetFields: Record<string, string> = {
      FirstName: firstName,
      LastName: lastName,
      Company: company,
      Status: "Open - Not Contacted",
      LeadSource: "QuickStart AI Lead Generation",
      ...(email ? { Email: email } : {}),
      ...(phone ? { Phone: phone } : {}),
      ...(website ? { Website: website } : {}),
    };

    let remoteLeadId: string | null = existingMapping?.external_object_id || null;
    let remoteRecord: Record<string, string> = {};

    // 1. If mapping exists, retrieve remote record to detect conflicts
    if (remoteLeadId) {
      try {
        const getRes = await fetch(
          `${instanceUrl}/services/data/v58.0/sobjects/Lead/${encodeURIComponent(remoteLeadId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (getRes.ok) {
          remoteRecord = (await getRes.json()) as any;
        } else if (getRes.status === 404) {
          remoteLeadId = null;
        }
      } catch {
        // Fall back to upsert
      }
    }

    // 2. If no mapping, search by email to prevent duplicate leads
    if (!remoteLeadId && email) {
      try {
        const query = encodeURIComponent(
          `SELECT Id, FirstName, LastName, Company, Email, Phone, Website, Status FROM Lead WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`,
        );
        const searchRes = await fetch(`${instanceUrl}/services/data/v58.0/query?q=${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (searchRes.ok) {
          const searchBody = (await searchRes.json()) as any;
          if (searchBody.records?.[0]?.Id) {
            remoteLeadId = searchBody.records[0].Id;
            remoteRecord = searchBody.records[0];
          }
        }
      } catch {
        // Continue to create
      }
    }

    // 3. Update existing lead with conflict preservation
    if (remoteLeadId) {
      const preservedFields: string[] = [];
      let conflictDetected = false;
      const fieldsToUpdate: Record<string, string> = { ...targetFields };

      if (options.preserveConflicts) {
        for (const [key, remoteVal] of Object.entries(remoteRecord)) {
          if (
            remoteVal &&
            targetFields[key] &&
            remoteVal.trim().toLowerCase() !== targetFields[key].trim().toLowerCase()
          ) {
            conflictDetected = true;
            preservedFields.push(key);
            // Preserve the remote representative edit
            delete fieldsToUpdate[key];
          }
        }
      }

      const patchRes = await fetch(
        `${instanceUrl}/services/data/v58.0/sobjects/Lead/${encodeURIComponent(remoteLeadId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fieldsToUpdate),
        },
      );

      if (!patchRes.ok && patchRes.status !== 204) {
        throw new Error(`Salesforce update lead failed: HTTP ${patchRes.status} ${patchRes.statusText}`);
      }

      return {
        remote_record_id: remoteLeadId,
        operation: "updated",
        conflict_detected: conflictDetected,
        preserved_fields: preservedFields,
        details: { updated_fields: fieldsToUpdate, preserved_fields: preservedFields },
      };
    }

    // 4. Create new Salesforce Lead
    const createRes = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Lead`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(targetFields),
    });

    if (!createRes.ok) {
      throw new Error(`Salesforce create lead failed: HTTP ${createRes.status} ${createRes.statusText}`);
    }

    const created = (await createRes.json()) as any;
    return {
      remote_record_id: String(created.id),
      operation: "created",
      conflict_detected: false,
      preserved_fields: [],
      details: { id: created.id },
    };
  }
}

export const salesforceAdapter = new SalesforceAdapter();
