import type {
  AgentGraphNode,
  ConversationNodeConfig,
  CapturedFieldDefinition,
} from "@quickstart/contracts";
import type { ExecutionContext, GraphNodeHandler, NodeExecutionResult } from "../types.js";
import { setVariablePath, resolveVariablePath } from "../eval-utils.js";
import type { ModelGatewayClient } from "../../clients/model-gateway.client.js";

export class ConversationHandler implements GraphNodeHandler<"conversation"> {
  type = "conversation" as const;

  constructor(_modelGateway?: ModelGatewayClient) {}

  async execute(
    node: AgentGraphNode<"conversation">,
    ctx: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as ConversationNodeConfig;
    const requiredFields = (config.captured_fields || []).filter((f) => f.required);
    let variables = { ...(ctx.sessionState.variables || {}) };
    const visitorText = ctx.visitorMessage?.trim() || "";

    // Check if visitor explicitly requested human or assistance
    if (
      /(speak to (a person|someone|human|agent|receptionist|operator)|help me|transfer me|talk to a human)/i.test(
        visitorText,
      )
    ) {
      return {
        status: "succeeded",
        chosenBranchPort: "needs_assistance",
      };
    }

    // Extract fields from visitor text
    if (visitorText && Array.isArray(config.captured_fields)) {
      variables = this.extractFields(
        visitorText,
        config.captured_fields,
        variables,
        ctx.sessionState.wait_state?.node_id === node.id
          ? ctx.sessionState.wait_state.captured_fields?.[0]
          : undefined,
      );
    }

    // Check completion criteria
    const missingFields: CapturedFieldDefinition[] = [];
    for (const field of requiredFields) {
      const val = resolveVariablePath(field.variable, variables);
      if (val === undefined || val === null || val === "") {
        missingFields.push(field);
      }
    }

    if (missingFields.length === 0 || config.continue_when === "always") {
      return {
        status: "succeeded",
        chosenBranchPort: "details_complete",
        outputVariables: variables,
      };
    }

    // Still missing required fields -> ask for the next missing field
    const nextField = missingFields[0];
    const prompt = this.generateFieldPrompt(nextField, node.name);

    if (ctx.onAssistantMessage) {
      await ctx.onAssistantMessage(prompt);
    }

    return {
      status: "waiting_for_input",
      waitForFields: [nextField.variable],
      outputVariables: variables,
      assistantMessage: prompt,
    };
  }

  private extractFields(
    text: string,
    fieldDefs: CapturedFieldDefinition[],
    currentVars: Record<string, unknown>,
    requestedField?: string,
  ): Record<string, unknown> {
    let updated = { ...currentVars };

    for (const def of fieldDefs) {
      const existing = resolveVariablePath(def.variable, updated);
      if (existing !== undefined && existing !== null && existing !== "") {
        continue; // preserve already supplied values
      }

      if (def.variable === requestedField && def.type === "text") {
        updated = setVariablePath(def.variable, text.slice(0, 500), updated);
      } else if (def.type === "email") {
        const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (email) updated = setVariablePath(def.variable, email[0], updated);
      } else if (
        def.type === "number" &&
        def.variable === requestedField &&
        /^-?\d+(?:\.\d+)?$/.test(text)
      ) {
        updated = setVariablePath(def.variable, Number(text), updated);
      } else if (
        def.type === "boolean" &&
        def.variable === requestedField &&
        /^(yes|no|true|false)$/i.test(text)
      ) {
        updated = setVariablePath(def.variable, /^(yes|true)$/i.test(text), updated);
      } else if (def.type === "phone") {
        const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch) {
          updated = setVariablePath(def.variable, phoneMatch[0].trim(), updated);
        }
      } else if (def.type === "date") {
        const dateMatch = text.match(
          /\b(?:tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/i,
        );
        if (dateMatch) {
          updated = setVariablePath(def.variable, dateMatch[0].trim(), updated);
        }
      } else if (def.type === "text" && def.variable.includes("name")) {
        const nameMatch = text.match(/(?:my name is|i am|this is|name:\s*)\s*([A-Za-z\s]+)/i);
        if (nameMatch) {
          updated = setVariablePath(def.variable, nameMatch[1].trim(), updated);
        } else if (def.variable === requestedField && text.length > 1) {
          // Single word entered after being asked for name
          updated = setVariablePath(def.variable, text.trim(), updated);
        }
      }
    }

    return updated;
  }

  private generateFieldPrompt(field: CapturedFieldDefinition, _nodeName: string): string {
    const label = field.variable.replace(/^.*[._]/, "").replace(/_/g, " ");
    if (field.type === "phone") {
      return `Could you please provide your phone number so we can reach you?`;
    }
    if (field.type === "date") {
      return `What date or time would work best for you?`;
    }
    return `Could you please share your ${label}?`;
  }
}
