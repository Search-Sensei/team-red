import { NavigatorItem } from './NavigatorItem';

export interface Navigator {
  name: string;
  displayName: string;
  count: number;
  allCount: number;
  isDateRange: boolean;
  items: NavigatorItem[];
}
