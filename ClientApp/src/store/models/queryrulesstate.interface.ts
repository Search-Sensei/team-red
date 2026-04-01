import { IQueryRule } from "./queryrule.interface";
import { QueryRuleModificationStatus } from "./queryrulemodificationstatus";

export interface IQueryRulesState {
    queryRules: IQueryRule[];
    selectedQueryRule: IQueryRule | null;
    modificationState: QueryRuleModificationStatus;
    // Data is being loading from the API.
    isLoading: boolean;
    // Data is being updated in the API.
    isUpdating: boolean;
    // When data was retrieved from the API.
    receivedAt: number;
    error: any;
    queryRulesSuccess: boolean,
}