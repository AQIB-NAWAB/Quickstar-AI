import { PLATFORM_EVENT_TYPES } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  ConditionGroup,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRunRecord,
  WorkflowStatus,
} from "../domain/types.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";

const ACTION_KINDS = new Set(["webhook", "update_tags", "email_notification", "agent_handoff"]);

export class WorkflowsService {
  constructor(
    private readonly repo: WorkflowsRepository,
    private readonly maxActivePerWorkspace: number,
  ) {}

  list(workspaceId: string): Promise<WorkflowListItem[]> {
    return this.repo.list(workspaceId);
  }

  async get(workspaceId: string, workflowId: string): Promise<WorkflowDefinition> {
    const wf = await this.repo.get(workspaceId, workflowId);
    if (!wf) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    return wf;
  }

  async create(
    workspaceId: string,
    body: {
      name?: string;
      description?: string | null;
      trigger_event_type?: string;
      condition_group?: ConditionGroup | null;
      actions?: WorkflowAction[];
      status?: WorkflowStatus;
    },
  ): Promise<WorkflowDefinition> {
    const name = body.name?.trim();
    if (!name) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
    }
    const trigger = body.trigger_event_type?.trim();
    if (!trigger || !(PLATFORM_EVENT_TYPES as readonly string[]).includes(trigger)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `trigger_event_type must be one of: ${PLATFORM_EVENT_TYPES.join(", ")}`,
      });
    }
    const actions = normalizeActions(body.actions ?? []);
    const status = body.status ?? "draft";
    if (status === "active") {
      await this.assertActiveCap(workspaceId);
      if (actions.length === 0) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "active workflows require at least one action",
        });
      }
    }

    return this.repo.create({
      workspaceId,
      name,
      description: body.description ?? null,
      triggerEventType: trigger,
      conditionGroup: body.condition_group ?? null,
      actions,
      status,
    });
  }

  async update(
    workspaceId: string,
    workflowId: string,
    body: {
      expected_version?: number;
      name?: string;
      description?: string | null;
      trigger_event_type?: string;
      condition_group?: ConditionGroup | null;
      actions?: WorkflowAction[];
      status?: WorkflowStatus;
    },
  ): Promise<WorkflowDefinition> {
    if (typeof body.expected_version !== "number") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "expected_version is required",
      });
    }
    if (
      body.trigger_event_type &&
      !(PLATFORM_EVENT_TYPES as readonly string[]).includes(body.trigger_event_type)
    ) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `trigger_event_type must be one of: ${PLATFORM_EVENT_TYPES.join(", ")}`,
      });
    }
    if (body.status === "active") {
      const current = await this.get(workspaceId, workflowId);
      if (current.status !== "active") {
        await this.assertActiveCap(workspaceId);
      }
      const actions = body.actions ? normalizeActions(body.actions) : current.actions;
      if (actions.length === 0) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "active workflows require at least one action",
        });
      }
    }

    return this.repo.update({
      workspaceId,
      workflowId,
      expectedVersion: body.expected_version,
      name: body.name,
      description: body.description,
      triggerEventType: body.trigger_event_type,
      conditionGroup: body.condition_group,
      actions: body.actions ? normalizeActions(body.actions) : undefined,
      status: body.status,
    });
  }

  async delete(workspaceId: string, workflowId: string): Promise<void> {
    const ok = await this.repo.softDelete(workspaceId, workflowId);
    if (!ok) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
  }

  listRuns(workspaceId: string, workflowId: string): Promise<WorkflowRunRecord[]> {
    return this.repo.listRuns(workspaceId, workflowId);
  }

  async getRun(
    workspaceId: string,
    workflowId: string,
    runId: string,
  ): Promise<WorkflowRunRecord> {
    const run = await this.repo.getRun(workspaceId, workflowId, runId);
    if (!run) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow run not found" });
    }
    return run;
  }

  eventCatalog(): Array<{
    type: string;
    status: "declared";
    fields: string[];
  }> {
    return [
      {
        type: "message.appended",
        status: "declared",
        fields: [
          "event.conversation_id",
          "event.message.id",
          "event.message.text",
          "event.message.role",
        ],
      },
      {
        type: "conversation.handed_off",
        status: "declared",
        fields: ["event.conversation_id", "event.assignee_user_id"],
      },
      {
        type: "conversation.released",
        status: "declared",
        fields: ["event.conversation_id", "event.released_by_user_id"],
      },
      {
        type: "agent.published",
        status: "declared",
        fields: ["event.agent_id", "event.version"],
      },
    ];
  }

  private async assertActiveCap(workspaceId: string): Promise<void> {
    const count = await this.repo.countActive(workspaceId);
    if (count >= this.maxActivePerWorkspace) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Workspace may have at most ${this.maxActivePerWorkspace} active workflows`,
      });
    }
  }
}

function normalizeActions(actions: WorkflowAction[]): WorkflowAction[] {
  if (!Array.isArray(actions)) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "actions must be an array" });
  }
  return actions.map((action, index) => {
    if (!action || typeof action !== "object") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `actions[${index}] is invalid`,
      });
    }
    if (!action.id || !ACTION_KINDS.has(action.kind)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `actions[${index}] requires id and a supported kind`,
      });
    }
    return {
      id: String(action.id),
      kind: action.kind,
      displayName: action.displayName || action.kind,
      config: action.config && typeof action.config === "object" ? action.config : {},
    };
  });
}
