/** Shared API types and constants (expanded as services land). */
export const CONTRACTS_VERSION = "0.0.0";

export type HealthResponse = {
  status: "ok";
  service: string;
};
