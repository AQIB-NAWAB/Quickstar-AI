import { evaluationPreviewStore } from "./preview-store";
import type {
EvaluationCase,
EvaluationDataset,
EvaluationOverviewData,
EvaluationRepository,
EvaluationRun,
EvaluationCaseResult,
RepositoryResult,
} from "./types";

export class ProductionEvaluationRepository implements EvaluationRepository {
  async getOverview(): Promise<RepositoryResult<EvaluationOverviewData>> {
    return {
      status: "unavailable",
      message:
        "Agent evaluation service is not connected. Configure offline evaluation worker in gateway.",
    };
  }

  async listDatasets(): Promise<RepositoryResult<EvaluationDataset[]>> {
    return {
      status: "unavailable",
      message: "Evaluation dataset service is not available yet.",
    };
  }

  async getDataset(): Promise<
    RepositoryResult<{ dataset: EvaluationDataset; cases: EvaluationCase[] }>
  > {
    return {
      status: "unavailable",
      message: "Evaluation dataset service is not available yet.",
    };
  }

  async createDataset(): Promise<RepositoryResult<EvaluationDataset>> {
    return {
      status: "unavailable",
      message: "Evaluation dataset creation is not supported by the backend yet.",
    };
  }

  async saveTestCase(): Promise<RepositoryResult<EvaluationCase>> {
    return {
      status: "unavailable",
      message: "Test case mutations are not supported yet.",
    };
  }

  async importCases(): Promise<
    RepositoryResult<{ importedCount: number; newRevision: number }>
  > {
    return {
      status: "unavailable",
      message: "CSV dataset import is not connected to a backend worker yet.",
    };
  }

  async listRuns(): Promise<RepositoryResult<EvaluationRun[]>> {
    return {
      status: "unavailable",
      message: "Evaluation execution history is not available yet.",
    };
  }

  async getRun(): Promise<
    RepositoryResult<{ run: EvaluationRun; results: EvaluationCaseResult[] }>
  > {
    return {
      status: "unavailable",
      message: "Evaluation run detail is not available yet.",
    };
  }

  async startRun(): Promise<RepositoryResult<EvaluationRun>> {
    return {
      status: "unavailable",
      message: "Evaluation execution engine is not connected.",
    };
  }
}

export const productionEvaluationRepository = new ProductionEvaluationRepository();

export function getEvaluationRepository(isPreview = false): EvaluationRepository {
  if (isPreview) {
    return evaluationPreviewStore;
  }
  return productionEvaluationRepository;
}
