import { List } from "lodash";

export interface Suggestion {
    id: string,
    query: string,
    suggestion?: string,
    profile: Array<string>,
    type?: string,
    count?: number
}

export interface ResponseSuggestion {
    body: BodySuggestion;
}

export interface BodySuggestion {
    result: Array<Suggestion>
}

export interface ISuggestionState {
    suggestionList: ResponseSuggestion,
    suggestionEdit: Suggestion,
    suggestionCount: number,
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
}
