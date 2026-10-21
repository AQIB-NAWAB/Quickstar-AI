import { evaluationPreviewStore } from "./preview-store";
import { serverEvaluationRepository } from "./server-repository";
import type { EvaluationRepository } from "./types";

export { serverEvaluationRepository } from "./server-repository";
export { apiEvaluationRepository } from "./api-repository";

export function getEvaluationRepository(isPreview = false): EvaluationRepository {
  if (isPreview) {
    return evaluationPreviewStore;
  }
  return serverEvaluationRepository;
}
