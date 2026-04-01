export interface FastLinks {
    id: string,
    navName: string,
    navDescription: string,
    navLink: string,
    sequence: any,
    extensionKeywords: Array<string>,
    fastLinkId: string,
    descriptionCategory: string,
    linkType: string,
    rowKey: string,
}

export interface FeaturedContent {
    type: FeaturedContentType;
    position: string;
    title: string;
    content: string;
    imageReference: string;
}

export interface Captions {
    text: string;
    highlights: string;
    score: string;
}

export enum FeaturedContentType {
    Html = 'html',
    UrlList = 'urlList'
}

export interface ResponseNavigation {
    body: BodyFastLinksIndex;
}

export interface BodyFastLinksIndex {
    featured: Array<FeaturedContent>;
    result: Array<FastLinks>;
}

export interface ResponseFastLinks {
    body: BodyFastLinks;
}

export interface BodyFastLinks {
    result: Array<ResultFastLinks>;
}

export interface ResultFastLinks {
    id: string;
    categoryDescription: string;
    categoryName: string;
    fastLinks: Array<FastLinks>;
}

export interface IFastLinksState {
    fastLinkList: ResponseFastLinks,
    fastLinkEdit: FastLinks,
    fastLinkCount: number,
    disallowedSeq: any[],
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
    actionCreate: boolean,
    categories: Array<Categories>,
    category: CategoryData,
    fastLinkData: ResponseNavigation,
    fastLinkListUpdate: ResultFastLinks,
}

export interface IActionCreateState {
    actionCreate: boolean,
}

export interface Categories {
    id: string;
    categoryName: string;
    description: string;
    check: boolean,
}

export interface PutCategories {
    categoryName: string;
    description: string;
}

export interface CategoryData {
    id: string;
    categoryName: string;
    description: string;
}

export interface ICategoriesState {
    categoriesList: Array<Categories>,
    categoriesEdit: Categories,
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
    actionCreate: boolean,
}

export interface UpdateCategories {
    categories: Array<PutCategories>,
    fastLink: Array<UpdateFastLinks>
}

export interface UpdateFastLinks {
    id: string,
    navName: string,
    navDescription: string,
    navLink: string,
    linkType: string,
    sequence: number,
}