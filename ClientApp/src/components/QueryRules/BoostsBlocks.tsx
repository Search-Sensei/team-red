import React, { useState, useEffect, useCallback } from "react";
import Button from "react-bootstrap/Button";
import { SearchQueryDefinition } from "../../store/models/Search/SearchQueryDefinition";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import { IBoostBlockSearchResultItem } from "../../store/models/Search/IBoostBlockSearchResultItem";
import { createRequestOptions, normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import { HttpMethod } from "../../store/models/httpmethod";
import MessageAlert from "../../common/components/MessageAlert";
import { MessageAlertType } from "../../common/types/MessageAlert.types";
import LoadingIndicator from "../../common/components/LoadingIndicator";
import * as _ from "lodash";
import { RecentFile } from "../../store/models/Search/RecentFile";
import { NavigatorInfoItem } from "../../store/models/Search/NavigatorInfoItem";
import { FeaturedContent } from "../../store/models/fastlinks";
import fetcher from "../../components/Fetcher"

interface SearchResults {
    resultsCount: string;
    searchId: string;
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
}
interface SearchResultItem {
    body: string;
    title: string;
    lastModified: string;
    profile: string;
    url: string;
    source: string;
    resultType: string;
    navLink: string;
    bodyNavigation: string;
    captions: string;
}
export interface IBoostsBlocksProps {
    /**
     * The query to use to retrieve search results.
     */
    query: string;

    /**
     * The profile to use to retrieve search results.
     */
    profile: string;

    /**
     * The previous state of the payload containing a list of boost and blocks. This is
     * used to update the search results list with the current state of boost and blocks.
     */
    payload: string;

    onRerender: () => void;

    /**
     * The callback function that will update the payload for this QueryRule.
     */
    onPayloadUpdate: (payload: string) => void;

    table: number;


}

/**
 * Displays a list of search results to allow the user to boost and block each search result.
 * @param props Properties for the component to get the user's search query and callback function to call when the payload is updated i.e.
 * when boosts and blocks are selected.
 */
const BoostsBlocks: React.FC<IBoostsBlocksProps> = (props) => {
    // AdminSettings.
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );

    // Messages.
    const defaultRetrievalErrorMessage: string =
        "An error occurred retrieving the search results.";
    const loadingIndicatorText: string = "Loading search results";

    // Pipe separate items in the payload.
    const separator: string = "|";

    const splitSeperator: RegExp = /\|(?![^(]*\))/;
    // Prefix blocked items with minus.
    const blockPrefix: string = "-";

    // The default to set the boost position so that we can order results.
    const defaultPosition: number | undefined = undefined;

    const getTitleByName = (name: string): string => {
        const profile = adminSettingsState.adminSettings.availableProfiles.find(profile => profile.name === name);
        return profile ? profile.title : name;
    };

    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");

    // The query and profile used to retrieve search results.
    const [currentQuery, setCurrentQuery] = useState(props.query);
    const [currentProfile, setCurrentProfile] = useState(props.profile);
    const noResultsWarning: string = `No results were found for '${currentQuery}' in profile '${currentProfile}'`;

    const initialBoosts: string[] = [];
    const [boosts, setBoosts] = useState(initialBoosts);

    const initialResults: IBoostBlockSearchResultItem[] = [];
    const [results, setResults] = useState(initialResults);
    const [isDataRetrieved, setIsDataRetrieved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [compare, setCompare] = useState(false);
    const onPayloadUpdateCallback = props.onPayloadUpdate;
    const onRerenderCallback = props.onRerender;

    /**
     * Ensures the position property defaults to -1 if not defined.
     * @param result The result item to get the position from.
     */
    const getPosition = useCallback(
        (result: IBoostBlockSearchResultItem): number => {
            const position =
                result.position === null || result.position === undefined
                    ? -1
                    : result.position;
            return position;
        },
        []
    );

    /**
     * Sets the payload to the boosted and blocked items pipe separated and call the parent callback function
     * with the updated payload to update the state. Blocked items are marked with a minus sign.
     * E.g.
     *  Boosted items => <URL1>|<URL2>|<URL3>...
     *  Blocked items => -<URL1>|-<URL2>|-<URL3>...
     */
    const onPayloadUpdate = useCallback(
        (resultsToUpdate: IBoostBlockSearchResultItem[]): void => {
            let payloadItems: string[] = [];

            // Select the boosted items from the results.
            const boostedItems: IBoostBlockSearchResultItem[] =
                resultsToUpdate.filter(
                    (result) => result.position !== undefined && result.position >= 0
                );

            // Sort by the boosted position.
            boostedItems.sort((a, b) => getPosition(a) - getPosition(b));

            // Add the boosted items.
            boostedItems.forEach((boostedItem) => {
                payloadItems.push(
                    `(${boostedItem.screenName ? boostedItem.screenName : boostedItem.title})${boostedItem.url ? boostedItem.url : boostedItem.navLink}`
                );
            });

            // Add the blocked items.
            resultsToUpdate.forEach((result) => {
                if (result.isBlocked) {
                    payloadItems.push(
                        `${blockPrefix}(${result.screenName ? result.screenName : result.title})${result.url ? result.url : result.navLink}`
                    );
                }
            });

            // Pipe separate the boosts and blocks.
            const payload: string = payloadItems.join(separator);

            // Call the callback from the parent.
            onPayloadUpdateCallback(payload);
        },
        [getPosition, onPayloadUpdateCallback, separator, blockPrefix]
    );

    /**
     * Sort the list by isBlocked, position, index so that Blocks appear at the top of the list, then Boosts appear and the
     * rest are sorted by the original search results 'index' order.
     * @param resultsToUpdate The result collection to sort.
     */
    const sortResults = useCallback(
        (
            resultsToUpdate: IBoostBlockSearchResultItem[]
        ): IBoostBlockSearchResultItem[] => {
            //
            const asc: boolean | "asc" | "desc" = "asc";
            const desc: boolean | "asc" | "desc" = "desc";
            resultsToUpdate = _.orderBy(
                resultsToUpdate,
                ["isBlocked", "position", "index"],
                [desc, asc, asc]
            );

            return resultsToUpdate;
        },
        []
    );

    /**
     * Get the search results for the specified query term in the conditions the user entered so that they can be displayed
     * in a table for a user to boost and block the items.
     */
    const getSearchResults = useCallback((): void => {
        const latestQuery = props.query;
        const latestProfile = props.profile;

        // Only retrieve results if a query/profile has been entered.
        if (
            latestQuery &&
            latestProfile &&
            latestQuery.length > 0 &&
            latestProfile.length > 0
        ) {
            if (latestQuery !== currentQuery || latestProfile !== currentProfile) {
                // Query term/Profile has changed so need to update the search results.
                setCurrentQuery(latestQuery);
                setCurrentProfile(latestProfile);
                setIsDataRetrieved(false);

                // Clear search results, boosts and update the payload now the query or profile has changed.
                setResults([]);
                onPayloadUpdateCallback("");
                setWarning("");
                setError("");
            }

            if (
                !isDataRetrieved &&
                currentQuery && currentQuery.length > 0 &&
                currentProfile && currentProfile.length > 0
            ) {
                // Show Spinner.
                setIsLoading(true);

                // Get the default definition from appsettings and update the query with the user specified search term.
                const searchQueryDefinition: SearchQueryDefinition = {
                    ...adminSettingsState.adminSettings.boostsBlocksSearchQueryDefinition,
                    query: currentQuery,
                    profile: currentProfile,
                };

                // Construct the Search API URL e.g. https://ds365api.search365.ai/search
                const url = `${normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl)}/search?issearchadmin=true`;

                const requestOptions: any = createRequestOptions(
                    HttpMethod.Post,
                    JSON.stringify(searchQueryDefinition)
                );
                //Internal_Call: Making a POST request to endpoint 'url'
                //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body, Stop Spiner when an error occurs
                // Receiving_Data: Convert response into file JSON if success, 
                fetcher(url, requestOptions)
                    .then(
                        (response) => response.json(),
                        (err) => {
                            setError("100013 Server not available");
                            setIsDataRetrieved(true);
                            setIsLoading(false);
                        }
                    )
                    .then((data: any) => {
                        // Stop Spinner.
                        const removeFields = <T,>(data: T[], fieldsToRemove: (keyof T)[]): Partial<T>[] => data.map((entry) => { const updatedEntry = { ...entry }; fieldsToRemove.forEach(field => { delete updatedEntry[field]; }); return updatedEntry; });
                        const excludeFields = ["profile", "index", "isBlocked"]
                        var searchResults = JSON.stringify(removeFields(data.body.results, excludeFields));
                        const f = async () => {
                            if (props.table == 1) {
                                (global as any).totalData = searchResults
                            }
                            setTimeout(() => {
                                if (props.table === 2) {
                                    if ((global as any).totalData === searchResults && searchResults !== "[]") {
                                        setCompare(true);
                                        (global as any).hide = true;
                                        onRerenderCallback();
                                    }
                                    else {
                                        setCompare(false);
                                        (global as any).hide = false;
                                        onRerenderCallback();
                                    }
                                    setIsLoading(false)
                                    getSearchResultsContent()
                                }
                            }, 1000)

                        }
                        try {
                            f()
                        } catch (error) {

                        } finally {
                            if (props.table === 1 || props.table === 0) {
                                setIsLoading(false);
                            }
                        }
                        setIsDataRetrieved(true);

                        if (data && data.body) {
                            const searchResults: SearchResults = data.body;

                            if (
                                searchResults &&
                                searchResults.results &&
                                searchResults.results.length > 0
                            ) {
                                let retrievedResults: IBoostBlockSearchResultItem[] =
                                    searchResults.results;

                                /**
                                 * Unpacks the initial payload into the boosts and blocks so they can be used to update the search results
                                 * display showing which items should be boosted and blocked.
                                 */
                                const pattern = /\((.*?)\)/;
                                let currentBoosts: string[] = [];
                                let currentBlocks: string[] = [];
                                let currentBlockName: string[] = [];
                                let currentBoostName: string[] = [];
                                let initialBoosts: string[] = [];
                                let initialBoostIndexes: number[] = [];

                                const payloadItems: string[] = props.payload?.split(splitSeperator) ?? [];

                                payloadItems.forEach((item) => {
                                    if (!item) return; // Skip null/undefined items
                                    const matches = item.match(pattern);
                                    if (item.startsWith(blockPrefix)) {
                                        // Block item - Add the URL without the leading blockPrefix (minus symbol).
                                        if (matches) {
                                            currentBlockName.push(matches[1]);
                                        }
                                        const newUrl = item.replace(pattern, '').substring(blockPrefix.length).trim();
                                        currentBlocks.push(newUrl);
                                    } else {
                                        if (matches) {
                                            currentBoostName.push(matches[1]);
                                        }
                                        const newUrl = item.replace(pattern, '').trim();
                                        // Boost item.
                                        currentBoosts.push(newUrl);
                                    }
                                });
                                // Loop the results to find if any of the currently boosted items exist in the results collection.
                                retrievedResults.forEach((item) => {
                                    const boostIndex: number = currentBoosts.findIndex(
                                        (boost) =>
                                            boost === (item.url == "" ? item.navLink : item.url)
                                    );
                                    const boostNameIndex: number = currentBoostName.findIndex(
                                        (boost) =>
                                            boost === (item.screenName == "" ? item.title : item.screenName)
                                    );
                                    if (boostNameIndex >= 0) {
                                        if (boostIndex >= 0) {
                                            // Add the found boost to the collection of found indexes.
                                            initialBoostIndexes.push(boostNameIndex);
                                        }
                                    } else {
                                        if (boostIndex >= 0 && currentBoostName.length == 0) {
                                            // Add the found boost to the collection of found indexes.
                                            initialBoostIndexes.push(boostIndex);
                                        }
                                    }
                                });
                                // Sort the array descending to push items into the array from the last to the first.
                                initialBoostIndexes = initialBoostIndexes.sort((a, b) => a - b);
                                initialBoostIndexes.forEach((boostIndex) => {
                                    initialBoosts.push(currentBoosts[boostIndex]);
                                });
                                setBoosts(initialBoosts);
                                // Assign the initial index, position and whether it is blocked for each result in the result list.
                                retrievedResults.forEach((item, index) => {
                                    const blockedIndex: number = currentBlocks.findIndex(
                                        (block) =>
                                            block === (item.url == "" ? item.navLink : item.url)
                                    );
                                    const boostIndex: number = initialBoosts.findIndex(
                                        (boost) =>
                                            boost === (item.url == "" ? item.navLink : item.url)
                                    );
                                    const blockedNameIndex: number = currentBlockName.findIndex(
                                        (block) =>
                                            block === (item.screenName == "" ? item.title : item.screenName)
                                    );
                                    const boostNameIndex: number = currentBoostName.findIndex(
                                        (boost) =>
                                            boost === (item.screenName == "" ? item.title : item.screenName)
                                    );
                                    item.index = index;

                                    if (blockedIndex >= 0) {
                                        if (currentBlocks[blockedIndex] != undefined && currentBlockName[blockedNameIndex] != undefined) {
                                            item.isBlocked = true;
                                        } else {
                                            item.isBlocked = false;
                                        }
                                    } else {
                                        item.isBlocked = false;
                                    }
                                    if (boostNameIndex >= 0) {
                                        if (boostIndex >= 0) {
                                            // Add the found boost to the collection of found indexes.
                                            item.position = boostNameIndex;
                                        }
                                        else {
                                            item.position = defaultPosition;
                                        }
                                    } else {
                                        if (boostIndex >= 0 && currentBoostName.length == 0) {
                                            // Add the found boost to the collection of found indexes.
                                            item.position = boostIndex;
                                        }
                                        else {
                                            item.position = defaultPosition;
                                        }
                                    }
                                    /*
                                    
                                    */
                                });

                                // Save the results in session.
                                retrievedResults = sortResults(retrievedResults);
                                setResults(retrievedResults);
                                onPayloadUpdate(retrievedResults);
                            } else {
                                // Warn the user that no results were found.
                                setWarning(noResultsWarning);
                            }
                        }

                    });

            }
        }
    }, [
        adminSettingsState.adminSettings.boostsBlocksSearchQueryDefinition,
        adminSettingsState.adminSettings.searchAdminApiUrl,
        currentQuery,
        currentProfile,
        props.query,
        props.profile,
        props.payload,
        isDataRetrieved,
        noResultsWarning,
        defaultPosition,
        setResults,
        onPayloadUpdate,
        onPayloadUpdateCallback,
        setWarning,
        setError,
        setBoosts,
        sortResults,
    ]);

    useEffect(() => {
        getSearchResults();
    }, [getSearchResults]);

    /**
     * Uses the title of the result item if it exists or the URL if not.
     * @param result The result item to get the title.
     */
    function getTitleForUrl(result: IBoostBlockSearchResultItem): string {
        if (result.title && result.title.length > 0) {
            return result.title;
        } else if (result.screenName && result.screenName.length > 0) {
            return result.screenName;
        }
        return result.url;
    }

    /**
     * Checks if the position has been set for the result item. If set to -1 it is not defined.
     * @param result The result item to get the position from.
     */
    function isBoosted(result: IBoostBlockSearchResultItem): boolean {
        const isBoosted = getPosition(result) >= 0;
        return isBoosted;
    }

    /**
     * Updates the result item in the collection of results and returns the udpated collection.
     * @param resultsToUpdate The results collection to update.
     * @param result the result to update in the collection.
     */
    function updateResults(
        resultsToUpdate: IBoostBlockSearchResultItem[],
        result: IBoostBlockSearchResultItem,
        isBoost: boolean = true
    ): void {
        // Ensure that the user can only boost OR block an item.

        if (isBoost) {
            // Boost item so unblock the item.
            if (result.isBlocked) {
                result.isBlocked = false;
            }
        } else {
            // Blocked item so remove the boosting and update all other items in the collection.
            if (isBoosted(result)) {
                updateBoostsAfterRemoval(resultsToUpdate, result);
                result.position = defaultPosition;
            }
        }

        // Find the item in the array.
        const index = resultsToUpdate.findIndex(
            (item) => item.index === result.index
        );
        resultsToUpdate[index] = result;

        // Sort the results.
        resultsToUpdate = sortResults(resultsToUpdate);
        setResults(resultsToUpdate);
        onPayloadUpdate(resultsToUpdate);
    }

    /**
     * Shifts this item to the top of the boost list i.e. position = 0. Shifts all other boosted items down
     * one position.
     * @param result The result item to boost.
     */
    function boost(result: IBoostBlockSearchResultItem): void {
        const updatedResults = results;

        // Update the collection that controls whether to display boost buttons.
        const newBoosts = boosts;
        newBoosts.push(result.url);
        setBoosts(newBoosts);

        // Move to below the other boosts.
        result.position = boosts.length - 1;
        updateResults(updatedResults, result);
    }

    /**
     * Updates all other boosts moving them up after removing a result from being boosted.
     * @param resultsToUpdate The result collection to update.
     * @param result The result that has had the boost removed.
     */
    function updateBoostsAfterRemoval(
        resultsToUpdate: IBoostBlockSearchResultItem[],
        result: IBoostBlockSearchResultItem
    ): IBoostBlockSearchResultItem[] {
        const currentPosition = getPosition(result);

        resultsToUpdate.forEach((item) => {
            if (item.position !== undefined && item.position > currentPosition) {
                // Shift each item up a position as we are removing this item.
                item.position = item.position - 1;
            }
        });

        // Update the collection that controls whether to display boost buttons.
        const newBoosts = boosts;
        const index = newBoosts.findIndex((boost) => boost === result.url);
        newBoosts.splice(index, 1);
        setBoosts(newBoosts);

        return resultsToUpdate;
    }

    /**
     * Shifts all boosted items up one position and resets the position on this item.
     * @param result The result item to remove the boost from.
     */
    function removeBoost(result: IBoostBlockSearchResultItem): void {
        let updatedResults = results;
        updatedResults = updateBoostsAfterRemoval(updatedResults, result);

        // Reset to not being boosted.
        result.position = defaultPosition;
        updateResults(updatedResults, result);
    }

    /**
     * Moves the current item up one position and swaps place with the item above it.
     * @param result The result item to move up.
     */
    function moveUp(result: IBoostBlockSearchResultItem): void {
        const newPosition = getPosition(result) - 1;
        results.forEach((item) => {
            if (item.position !== undefined && item.position === newPosition) {
                // Swap positions with the current item.
                item.position = result.position;
            }
        });

        result.position = newPosition;
        updateResults(results, result);
    }

    /**
     * Moves the current item down one position and swaps place with the item below it.
     * @param result The result item to move down.
     */
    function moveDown(result: IBoostBlockSearchResultItem): void {
        const newPosition = getPosition(result) + 1;

        results.forEach((item) => {
            if (item.position !== undefined && item.position === newPosition) {
                // Swap positions with the current item.
                item.position = result.position;
            }
        });

        result.position = newPosition;
        updateResults(results, result);
    }

    /**
     * Blocks the current item.
     * @param result The result item to block.
     */
    function block(result: IBoostBlockSearchResultItem): void {
        result.isBlocked = true;
        updateResults(results, result, false);
    }

    /**
     * Removes the block from the current item.
     * @param result The result item to unblock.
     */
    function removeBlock(result: IBoostBlockSearchResultItem): void {
        result.isBlocked = false;
        updateResults(results, result, false);
    }

    /**
     * Displays the rows for the search results.
     */
    function getSearchResultRows(): JSX.Element[] | null {
        return results.map((result) => {
            const position: number = isBoosted(result) ? getPosition(result) : -1;

            return (
                <tr key={result.index} className="table-row">
                    <td className={!(global as any).hide ? 'result' : 'result-full'}>
                        <div className="title">
                            <a
                                href={
                                    result.url == "" && result.navLink != ""
                                        ? result.navLink
                                        : result.url
                                }
                                title={getTitleForUrl(result)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {getTitleForUrl(result)}
                            </a>
                        </div>
                        <div className="url" >
                            <a
                                href={result.url}
                                title={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {result.url}
                            </a>
                        </div>
                        <div
                            className="body"
                            dangerouslySetInnerHTML={{ __html: result.body }}
                        />
                        <div className="url">
                            <a
                                href={result.navLink}
                                title={result.navLink}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {result.navLink}
                            </a>
                        </div>
                        <div
                            className="body"
                        dangerouslySetInnerHTML={{ __html: result.bodyNavigation }}
                    ></div>
                </td>
                <td className="position text-center">
                        {isBoosted(result) ? position + 1 : null}
                    </td>
                    <td className="action-button-column text-center">
                        {isBoosted(result) ? null : (
                            <Button
                                variant="secondary"
                                className="boost link-button action-link-button"
                                onClick={() => boost(result)}
                                title="Boost"
                            >
                                {/* @ts-ignore */}
                                <i className="fa fa-plus-circle" aria-hidden="true"></i>
                            </Button>
                        )}
                        {isBoosted(result) ? (
                            <Button
                                variant="secondary"
                                className="unboost link-button action-link-button"
                                onClick={() => removeBoost(result)}
                                title="Remove Boost"
                            >
                                {/* @ts-ignore */}
                                <i className="fa fa-minus-circle" aria-hidden="true"></i>
                            </Button>
                        ) : null}
                        {isBoosted(result) && boosts.length > 1 && position >= 1 ? (
                            <Button
                                variant="secondary"
                                className="moveup link-button action-link-button"
                                onClick={() => moveUp(result)}
                                title="Move Up"
                            >
                                {/* @ts-ignore */}
                                <i className="fa fa-arrow-circle-up" aria-hidden="true"></i>
                            </Button>
                        ) : null}
                        {isBoosted(result) &&
                            boosts.length > 1 &&
                            position >= 0 &&
                            position < boosts.length - 1 ? (
                            <Button
                                variant="secondary"
                                className="movedown link-button action-link-button"
                                onClick={() => moveDown(result)}
                                title="Move Down"
                            >
                                {/* @ts-ignore */}
                                <i className="fa fa-arrow-circle-down" aria-hidden="true"></i>
                            </Button>
                        ) : null}
                    </td>
                    <td className="action-button-column text-center">
                        {result.isBlocked ? null : (
                            <Button
                                variant="secondary"
                                className="block link-button action-link-button"
                                onClick={() => block(result)}
                                title="Block"
                            >
                                {/* @ts-ignore */}
                                <i className="fa fa-ban" aria-hidden="true"></i>
                            </Button>
                        )}
                        {result.isBlocked ? (
                            <Button
                                variant="secondary"
                                className="unblock link-button action-link-button"
                                onClick={() => removeBlock(result)}
                                title="Remove Block"
                            >
                                {/* @ts-ignore */}
                                <i className="fa fa-times-circle" aria-hidden="true"></i>
                            </Button>
                        ) : null}
                    </td>
                </tr>
            );
        });
    }

    /**
     * Displays the table of search results with links to boost and block the item.
     */
    function getSearchResultsContent(): JSX.Element | null {
        if (!results || results.length === 0) {
            return null;
        }

        return (
            <table id="boostsAndBlocksSearchResults" className="table">
                <thead className="thead-dark">
                    <tr>
                        <th className={(global as any).hide === false ? "result" : "result-full"}>Result</th>
                        <th className="align-text-center">Position</th>
                        <th className="actionColumn align-text-center">Boost</th>
                        <th className="actionColumn align-text-center">Block</th>
                    </tr>
                </thead>
                <tbody>{getSearchResultRows()}</tbody>
            </table>
        );
    }

    return (
        <>
            {compare === false ? (
                <div>
                    {isLoading ? (
                        <LoadingIndicator
                            text={loadingIndicatorText}
                            isLoading={isLoading}
                        />
                    ) :
                        <div className="boost-blocks-container" style={{}}>
                            {(global as any).hide === true ? (<div style={{ height: 20 }}>
                                <h6 className="info-text text-center">
                                    {getTitleByName(props.profile) + " + " + getTitleByName((global as any).profile[1])}
                                </h6>
                            </div>) : (<div style={{ height: 20 }}>
                                <h6 className="info-text text-center">
                                    {getTitleByName(props.profile)}
                                </h6>
                            </div>)}
                            <MessageAlert type={MessageAlertType.Error} message={error} />
                            <MessageAlert type={MessageAlertType.Warning} message={warning} />
                            <div className="table-responsive shadow portlet">
                                {getSearchResultsContent()}
                            </div>
                        </div>
                    }
                </div>
            ) : null}
        </>
    );
};

export default BoostsBlocks;
