import { SearchResultItem } from "./SearchResultItem";

/**
 * Used for displaying search results for boosting and blocking.
 */
export interface IBoostBlockSearchResultItem extends SearchResultItem {
	/**
	 * The position for the item being boosted.
	 */
	position?: number;

	/**
	 * The position in the array when first retrieved.
	 */
	index?: number;

	/**
	 * Marks the item as being blocked.
	 */ 
	isBlocked?: boolean;

	screenName?: string;
	
	navLink: string;

	bodyNavigation: string;
}