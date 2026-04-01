import { List } from "lodash";

export interface Navigation {
    id: string,
    navName: string,
    navLink: string,
    navDescription: string,
    extensionKeywords: Array<string>,
    linkType: string,
    profile: string,
    accessibilityTitle: string;
    accessibilityDescription: string;
}

export interface FeaturedContent {
    type: FeaturedContentType;
    position: string;
    title: string;
    content: string;
    imageReference: string;
}

export enum FeaturedContentType {
    Html = 'html',
    UrlList = 'urlList'
}

export interface ResponseNavigation {
    body: BodyNavigation;
}

export interface BodyNavigation {
    featured?: Array<FeaturedContent>,
    result: Array<Navigation>
    resultsCount?: number
}

export interface INavigationState {
    navigationList: ResponseNavigation,
    navigationEdit: Navigation,
    navigationCount: number,
    currentPage: number,
    currentProfile: string,
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
}
