import { HistoryResultItem } from './HistoryResultItem';

export interface GroupedHistoryResults {
  searchId: string;
  displayName: string;
  fromDate: Date;
  toDate: Date;
  results: HistoryResultItem[];
}
