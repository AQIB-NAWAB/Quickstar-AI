import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateConditionGroup, evaluateRule } from "./conditions.js";

test("evaluateRule supports contains on nested message text", () => {
  const ok = evaluateRule(
    { id: "1", field: "message.text", operator: "contains", value: "payment" },
    { conversation_id: "c1", message: { text: "Need help with payment please" } },
  );
  assert.equal(ok, true);
});

test("evaluateRule supports event. prefix paths", () => {
  const ok = evaluateRule(
    { id: "1", field: "event.assignee_user_id", operator: "equals", value: "u1" },
    { conversation_id: "c1", assignee_user_id: "u1" },
  );
  assert.equal(ok, true);
});

test("empty condition group matches", () => {
  const result = evaluateConditionGroup(null, {});
  assert.equal(result.matched, true);
});

test("AND group fails closed when one rule fails", () => {
  const result = evaluateConditionGroup(
    {
      id: "g1",
      logic: "and",
      rules: [
        { id: "r1", field: "message.text", operator: "contains", value: "payment" },
        { id: "r2", field: "message.role", operator: "equals", value: "user" },
      ],
    },
    { message: { text: "payment due", role: "assistant" } },
  );
  assert.equal(result.matched, false);
});
