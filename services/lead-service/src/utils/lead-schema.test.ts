import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultLeadSchema,
  normalizeLeadSchema,
  projectDenormFromAttributes,
} from "./lead-schema.js";
import { sanitizeCapturedFields } from "./fields.js";

test("defaultLeadSchema has identity email phone roles", () => {
  const schema = defaultLeadSchema();
  assert.ok(schema.some((f) => f.role === "identity"));
  assert.ok(schema.some((f) => f.role === "contact_email"));
  assert.ok(schema.some((f) => f.role === "contact_phone"));
});

test("normalizeLeadSchema accepts custom fields and rejects bad keys", () => {
  const schema = normalizeLeadSchema([
    { key: "Company Name", label: "Company", role: "custom" },
    { key: "email", label: "Email", role: "contact_email" },
    { key: "!!!", label: "bad", role: "custom" },
  ]);
  assert.ok(schema.some((f) => f.key === "company_name"));
  assert.ok(schema.some((f) => f.key === "email" && f.role === "contact_email"));
  assert.ok(!schema.some((f) => f.key === ""));
});

test("projectDenormFromAttributes fills missing contact columns", () => {
  const schema = normalizeLeadSchema([
    { key: "full_name", label: "Name", role: "identity" },
    { key: "work_email", label: "Email", role: "contact_email" },
    { key: "mobile", label: "Phone", role: "contact_phone" },
  ]);
  const denorm = projectDenormFromAttributes(
    schema,
    { full_name: "Ada", work_email: "ada@ex.com", mobile: "+1555", company: "Acme" },
    {},
  );
  assert.equal(denorm.name, "Ada");
  assert.equal(denorm.email, "ada@ex.com");
  assert.equal(denorm.phone, "+1555");
});

test("sanitizeCapturedFields rejects invalid keys and caps values", () => {
  const fields = sanitizeCapturedFields(
    { "Good Key": "x".repeat(5000), "": "nope", "ok": 12 },
    { maxKeys: 50, maxValueLength: 10 },
  );
  assert.equal(fields.good_key, "x".repeat(10));
  assert.equal(fields.ok, 12);
  assert.equal(Object.keys(fields).includes(""), false);
});
