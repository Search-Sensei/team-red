export interface Synonym {
    id: string,
    word: string,
    synonyms: string,
    is: string,
}

export interface ISynonymState {
    synonymList: Synonym[],
    synonymEdit: Synonym,
    synonymCount: number,
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
}
