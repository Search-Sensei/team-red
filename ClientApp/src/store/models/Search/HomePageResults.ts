import { HistoryResults } from './HistoryResults';

export interface HomePageResults {
  recentSearches: string[];
  recentlyViewedItems: HistoryResults;
  availableProfiles: string[];
}
