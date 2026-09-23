export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
};

export type AuthenticatedUser = {
  userId: string;
  orgId: string;
  sessionId: string;
};
