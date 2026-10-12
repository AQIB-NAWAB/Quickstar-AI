import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeCapturedFields, sanitizeCapturedFields, sanitizeTags } from "./fields.js";

describe("sanitizeTags", () => {
  it("dedupes and lowercases", () => {
    assert.deepEqual(sanitizeTags(["Sales", "sales", "VIP"]), ["sales", "vip"]);
  });
});

describe("sanitizeCapturedFields", () => {
  it("keeps flexible bot enrichment keys", () => {
    const fields = sanitizeCapturedFields(
      { Company: "Acme", "employee count": 40, hot: true },
      { maxKeys: 50, maxValueLength: 2000 },
    );
    assert.equal(fields.company, "Acme");
    assert.equal(fields.employee_count, 40);
    assert.equal(fields.hot, true);
  });
});

describe("mergeCapturedFields", () => {
  it("overwrites with incoming enrichment", () => {
    const merged = mergeCapturedFields(
      { company: "Old", city: "NYC" },
      { company: "New" },
      { maxKeys: 50, maxValueLength: 2000 },
    );
    assert.equal(merged.company, "New");
    assert.equal(merged.city, "NYC");
  });
});
