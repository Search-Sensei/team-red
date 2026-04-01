export interface NavigatorItem {
  name: string;
  displayName: string;
  count: number;
  from: string;
  to: string;
  selected: boolean;
  items: NavigatorItem[];
}
