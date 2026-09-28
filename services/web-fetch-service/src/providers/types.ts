import type {
  ScrapeProviderInput,
  ScrapeProviderOutput,
  SearchProviderInput,
  SearchProviderOutput,
} from "../domain/types.js";

export type AcquisitionProvider = {
  readonly profileId: string;
  readonly driver: string;
  scrape(input: ScrapeProviderInput): Promise<ScrapeProviderOutput>;
  search?(input: SearchProviderInput): Promise<SearchProviderOutput>;
};
