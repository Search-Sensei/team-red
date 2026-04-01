import { SearchResultItem } from './SearchResultItem';
import { SearchQueryDefinition } from './SearchQueryDefinition';

export interface HistoryResultItem {
  dateUtc: string;
  historyId: string;
  searchId: string;
  searchResultItem: SearchResultItem;
  searchDefinition: SearchQueryDefinition;
}
