import type { ServerResponse } from "node:http";
import type { OrganizationsService } from "../services/organizations.service.js";
import { sendJson } from "../utils/http-response.js";

export async function handleListOrganizations(
  res: ServerResponse,
  requestId: string,
  userId: string,
  organizations: OrganizationsService,
): Promise<void> {
  const list = await organizations.listOrganizations(userId);
  sendJson(res, 200, { request_id: requestId, organizations: list });
}

export async function handleGetOrganization(
  res: ServerResponse,
  requestId: string,
  orgId: string,
  userId: string,
  organizations: OrganizationsService,
): Promise<void> {
  const org = await organizations.getOrganization(orgId, userId);
  sendJson(res, 200, { request_id: requestId, organization: org });
}

export async function handleCreateOrganization(
  res: ServerResponse,
  requestId: string,
  userId: string,
  body: { name?: string },
  organizations: OrganizationsService,
): Promise<void> {
  const org = await organizations.createOrganization(userId, body);
  sendJson(res, 201, { request_id: requestId, organization: org });
}

export async function handleUpdateOrganization(
  res: ServerResponse,
  requestId: string,
  orgId: string,
  userId: string,
  body: { name?: string },
  organizations: OrganizationsService,
): Promise<void> {
  const org = await organizations.updateOrganization(orgId, userId, body);
  sendJson(res, 200, { request_id: requestId, organization: org });
}

export async function handleVerifyMembership(
  res: ServerResponse,
  requestId: string,
  orgId: string,
  userId: string,
  organizations: OrganizationsService,
): Promise<void> {
  const result = await organizations.verifyMembership(orgId, userId);
  sendJson(res, 200, { request_id: requestId, ...result });
}
