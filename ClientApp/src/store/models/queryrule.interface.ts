import { QueryRuleType } from "./queryruletype";
import { IQueryRuleCondition } from "./queryrulecondition.interface";

export interface IQueryRule {
    id: string;
    id2: string;
    name: string;
    type: QueryRuleType;
    payload: string;
    payload2: string;
    datestart: string;
    dateend: string;
    profiles: string[];
    conditions: IQueryRuleCondition[];
}