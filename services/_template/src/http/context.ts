import type { Logger } from "@quickstart/logging";

export type TemplateHttpContext = {
  logger: Logger;
  serviceName: string;
  port: number;
};
