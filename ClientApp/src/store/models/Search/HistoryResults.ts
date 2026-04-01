import { HistoryResultItem } from './HistoryResultItem';
import { Navigator } from './Navigator';

export interface HistoryResults {
  resultsCount: string;
  searchId: string;
  results: HistoryResultItem[];
  navigators: Navigator[];
  availableProfiles: string[];
}
