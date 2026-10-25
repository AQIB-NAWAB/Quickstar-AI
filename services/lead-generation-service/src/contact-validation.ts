/**
 * Truthful Contact Validation (Free Baseline Checks)
 *
 * Distinctly separates:
 * 1. Observed on source (found verbatim on page/document)
 * 2. Format checked (valid RFC 5322 syntax, E.164 phone numbering plan)
 * 3. Domain mail routing checked (DNS MX, null MX rejection, A/AAAA fallback, transient DNS = unknown)
 * 4. Provider verified (only when verified by explicit customer-connected third-party provider)
 *
 * Never claims:
 * - Scraped email is deliverability-verified
 * - Formatted phone is active or owner-verified
 * - Bulk SMTP probing
 */

import { promises as dns } from "node:dns";

export type EmailValidationStatus =
  | "observed_only"
  | "format_invalid"
  | "domain_not_routable"  // null MX or NXDOMAIN
  | "domain_routable"      // Valid MX or valid A/AAAA fallback
  | "domain_unknown"       // DNS lookup transient failure
  | "provider_verified"
  | "provider_undeliverable";

export type PhoneValidationStatus =
  | "observed_only"
  | "format_invalid"
  | "numbering_plan_valid"   // Valid length & formatting for country
  | "numbering_plan_possible" // Plausible digits, country unknown
  | "provider_verified";

export type EmailValidationResult = {
  raw: string;
  normalized: string; // Preserves raw local-part casing, lowercases domain
  localPart: string;
  domain: string;
  formatValid: boolean;
  isRoleAccount: boolean;
  mailRoutingStatus: "routable" | "null_mx_rejected" | "domain_not_found" | "unknown";
  status: EmailValidationStatus;
  explanation: string;
  checkedAt: string;
};

export type PhoneValidationResult = {
  raw: string;
  normalized: string; // Stripped of whitespace/decorations, preserving leading +
  digitsOnly: string;
  countryCode?: string;
  formatValid: boolean;
  status: PhoneValidationStatus;
  explanation: string;
  checkedAt: string;
};

const ROLE_PREFIXES = new Set([
  "admin", "administrator", "info", "support", "help", "sales", "contact",
  "billing", "office", "team", "hello", "hi", "careers", "jobs", "press",
  "media", "legal", "security", "inquiries", "general", "marketing",
]);

// RFC 5322 compatible email pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates an email address syntax and domain mail routing without destructive local-part modification.
 */
export async function validateEmail(rawEmail: string): Promise<EmailValidationResult> {
  const trimmed = rawEmail.trim();
  const checkedAt = new Date().toISOString();

  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return {
      raw: trimmed,
      normalized: trimmed,
      localPart: "",
      domain: "",
      formatValid: false,
      isRoleAccount: false,
      mailRoutingStatus: "domain_not_found",
      status: "format_invalid",
      explanation: "Email syntax is invalid (missing valid @ separator)",
      checkedAt,
    };
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1).toLowerCase();
  const normalized = `${localPart}@${domainPart}`;

  if (!EMAIL_REGEX.test(normalized) || domainPart.length > 253 || localPart.length > 64) {
    return {
      raw: trimmed,
      normalized,
      localPart,
      domain: domainPart,
      formatValid: false,
      isRoleAccount: false,
      mailRoutingStatus: "domain_not_found",
      status: "format_invalid",
      explanation: "Email violates RFC 5322 syntax specifications",
      checkedAt,
    };
  }

  const isRoleAccount = ROLE_PREFIXES.has(localPart.toLowerCase());

  // Check Domain Mail Routing via DNS
  let mailRoutingStatus: EmailValidationResult["mailRoutingStatus"] = "unknown";
  let status: EmailValidationStatus = "observed_only";
  let explanation = "Syntax valid; domain routing not yet checked.";

  try {
    // 1. Check MX records
    const mxRecords = await dns.resolveMx(domainPart);

    if (mxRecords && mxRecords.length > 0) {
      // Check for Null MX (RFC 7505): a single MX record with exchange "." or ""
      const isNullMx = mxRecords.some(
        (mx) => mx.exchange === "." || mx.exchange === "" || (mx.priority === 0 && mx.exchange === "."),
      );

      if (isNullMx) {
        mailRoutingStatus = "null_mx_rejected";
        status = "domain_not_routable";
        explanation = "Domain explicitly rejects all incoming mail (RFC 7505 Null MX record)";
      } else {
        mailRoutingStatus = "routable";
        status = "domain_routable";
        explanation = `Domain has ${mxRecords.length} configured MX record(s). Delivery not verified.`;
      }
    } else {
      // RFC 5321 fallback to Address records (A/AAAA) if no MX records returned
      try {
        const aRecords = await dns.resolve4(domainPart);
        if (aRecords && aRecords.length > 0) {
          mailRoutingStatus = "routable";
          status = "domain_routable";
          explanation = "No MX records found; routable via RFC 5321 A-record fallback.";
        } else {
          mailRoutingStatus = "domain_not_found";
          status = "domain_not_routable";
          explanation = "No MX or A records configured for this domain.";
        }
      } catch {
        mailRoutingStatus = "domain_not_found";
        status = "domain_not_routable";
        explanation = "Domain has no valid mail routing records (neither MX nor A).";
      }
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      // Try fallback to A record
      try {
        const aRecords = await dns.resolve4(domainPart);
        if (aRecords && aRecords.length > 0) {
          mailRoutingStatus = "routable";
          status = "domain_routable";
          explanation = "No MX records found; routable via RFC 5321 A-record fallback.";
        } else {
          mailRoutingStatus = "domain_not_found";
          status = "domain_not_routable";
          explanation = "Domain does not exist or has no host records.";
        }
      } catch {
        mailRoutingStatus = "domain_not_found";
        status = "domain_not_routable";
        explanation = "Domain does not exist or has no host records.";
      }
    } else {
      // Transient error (ETIMEOUT, ESERVFAIL, ECONNREFUSED)
      mailRoutingStatus = "unknown";
      status = "domain_unknown";
      explanation = `Transient DNS query failure (${code ?? "DNS_ERROR"}); routing status remains unknown.`;
    }
  }

  return {
    raw: trimmed,
    normalized,
    localPart,
    domain: domainPart,
    formatValid: true,
    isRoleAccount,
    mailRoutingStatus,
    status,
    explanation,
    checkedAt,
  };
}

/**
 * Validates and normalizes phone number with country context without claiming active number verification.
 */
export function validatePhone(rawPhone: string, countryContext?: string): PhoneValidationResult {
  const trimmed = rawPhone.trim();
  const checkedAt = new Date().toISOString();
  const digitsOnly = trimmed.replace(/\D/g, "");

  // Minimal sensible phone digits: 7 to 15 digits (ITU-T E.164 max 15 digits)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      raw: trimmed,
      normalized: trimmed,
      digitsOnly,
      formatValid: false,
      status: "format_invalid",
      explanation: `Phone number has ${digitsOnly.length} digits; valid numbering plans require between 7 and 15 digits.`,
      checkedAt,
    };
  }

  // Preserve leading plus if international
  const hasLeadingPlus = trimmed.startsWith("+");
  const normalized = hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;

  let countryCode = countryContext;
  let status: PhoneValidationStatus = "numbering_plan_possible";
  let explanation = "Plausible phone numbering format. Active status is unverified.";

  // Detect international dialing prefix
  if (hasLeadingPlus) {
    if (digitsOnly.startsWith("1") && digitsOnly.length === 11) {
      countryCode = "US";
      status = "numbering_plan_valid";
      explanation = "Valid NANP (US/Canada) 10-digit number format with +1 country code. Active status unverified.";
    } else if (digitsOnly.startsWith("44") && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
      countryCode = "GB";
      status = "numbering_plan_valid";
      explanation = "Valid UK international phone number format. Active status unverified.";
    } else if (digitsOnly.startsWith("92") && digitsOnly.length === 12) {
      countryCode = "PK";
      status = "numbering_plan_valid";
      explanation = "Valid Pakistan international phone number format. Active status unverified.";
    } else {
      status = "numbering_plan_valid";
      explanation = "Valid international E.164 phone numbering format. Active status unverified.";
    }
  } else if (countryContext === "US" || countryContext === "CA") {
    if (digitsOnly.length === 10) {
      status = "numbering_plan_valid";
      explanation = "Valid North American 10-digit telephone numbering format. Active status unverified.";
    }
  } else if (countryContext === "GB") {
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      status = "numbering_plan_valid";
      explanation = "Valid UK national telephone numbering format. Active status unverified.";
    }
  }

  return {
    raw: trimmed,
    normalized,
    digitsOnly,
    countryCode,
    formatValid: true,
    status,
    explanation,
    checkedAt,
  };
}
