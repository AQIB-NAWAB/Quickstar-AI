import { apiEvaluationRepository } from "./api-repository";
import { evaluationPreviewStore } from "./preview-store";
import type { EvaluationRepository } from "./types";

export function getEvaluationRepository(isPreview = false): EvaluationRepository {
  if (isPreview) {
    return evaluationPreviewStore;
  }
  return apiEvaluationRepository;
}
