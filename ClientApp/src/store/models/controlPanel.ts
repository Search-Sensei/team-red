export interface ControlPane {
    id: string,
    url: string,
    modified: string | null,
    datasource: string,
    category: string,
    indexName: string
}

export interface IControlPaneState {
    controlPainList: ControlPane[],
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
    documentCount: number
}
