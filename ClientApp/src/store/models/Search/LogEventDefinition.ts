import { SearchQueryDefinition } from './SearchQueryDefinition';
import { SearchResultItem } from './SearchResultItem';

export interface LogEventDefinition {
  clickEvent: string;
  searchId: string;
  searchUrl: string;
  searchDefinition: SearchQueryDefinition;
  timeOnPageMs: number;
  itemNumber: number;
  searchResultItem: SearchResultItem;
}
