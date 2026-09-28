import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideAcquisitionProviders } from "../policy/decide.js";

describe("acquisition policy", () => {
  it("prefers direct_http before olostep for scrape", () => {
    const decision = decideAcquisitionProviders({
      action: "scrape",
      renderJs: false,
      profiles: [
        {
          id: "olostep",
          driver: "olostep",
          enabled: true,
          priority: 20,
          unitCostMicrosScrape: 500,
          unitCostMicrosSearch: 800,
        },
        {
          id: "direct_http",
          driver: "direct_http",
          enabled: true,
          priority: 10,
          unitCostMicrosScrape: 10,
          unitCostMicrosSearch: 0,
        },
      ],
    });
    assert.equal(decision.allow, true);
    if (decision.allow) {
      assert.deepEqual(decision.profileIds.slice(0, 2), ["direct_http", "olostep"]);
    }
  });

  it("requires olostep or fake when render_js is true", () => {
    const decision = decideAcquisitionProviders({
      action: "scrape",
      renderJs: true,
      profiles: [
        {
          id: "direct_http",
          driver: "direct_http",
          enabled: true,
          priority: 10,
          unitCostMicrosScrape: 10,
          unitCostMicrosSearch: 0,
        },
      ],
    });
    assert.equal(decision.allow, false);
  });
});
