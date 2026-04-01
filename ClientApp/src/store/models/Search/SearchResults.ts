import { SearchResultItem } from './SearchResultItem';
import { Navigator } from './Navigator';
import { SearchQueryDefinition } from './SearchQueryDefinition';
import { RecentFile } from './RecentFile';
import { NavigatorInfoItem } from './NavigatorInfoItem';
import { FeaturedContent } from './FeaturedContent';
import { Answers } from './Answers';

export interface SearchResults {
  resultsCount: string;
  searchId: string;
  answers: Answers[];
  results: SearchResultItem[];
  navigators: Navigator[];
  didYouMean: string[];
  searchDefinition: SearchQueryDefinition;
  recentSearches: string[];
  relatedSearches: string[];
  availableProfiles: string[];
  recentFiles: RecentFile[];
  navigatorInfo: NavigatorInfoItem[];
  featured: FeaturedContent[];
  result?: SearchResultItem[];
}
