/**
 * Explicit capabilities declarations for Settings feature availability
 * based on current backend implementations.
 */
export const SETTINGS_CAPABILITIES = {
  // Workspace updates persist name and slug; description is not stored in DB schema
  workspaceDescription: false,

  // Workspace logo upload is not supported in workspace-service
  workspaceAvatarUpload: false,

  // Organization API key list endpoint returns key_prefix, not the last four characters
  apiKeyLastFour: false,

  // Member list endpoint returns only userId, role, and timestamps without user profile/email
  memberDirectoryProfiles: false,

  // Invite endpoint returns raw_token but does not deliver emails or generate public acceptance URLs
  inviteEmailDelivery: false,

  // Secret rotation re-encrypts stored ciphertext in the vault; it does not replace external provider API keys
  secretProviderRotation: false,
} as const;
