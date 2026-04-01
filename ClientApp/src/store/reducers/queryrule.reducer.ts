import { IActionBase } from "../models/root.interface";
import { IQueryRulesState } from "../models/queryrulesstate.interface";
import {
    REQUEST_QUERY_RULES, RECEIVE_QUERY_RULES, RECEIVE_QUERY_RULES_ERROR, RECEIVE_QUERY_RULES_SUCCESS,
    DELETE_QUERY_RULE_SUBMITTED, DELETE_QUERY_RULE_ERROR, DELETE_QUERY_RULE_SUCCESS,
    PUT_QUERY_RULE_SUBMITTED, PUT_QUERY_RULE_ERROR, PUT_QUERY_RULE_SUCCESS,
    CHANGE_SELECTED_QUERY_RULE, CLEAR_SELECTED_QUERY_RULE, SET_QUERY_RULE_MODIFICATION_STATE
} from "../actions/queryrules.actions";
import { QueryRuleModificationStatus } from "../models/queryrulemodificationstatus";
import { IQueryRule } from "../models/queryrule.interface";

const initialState: IQueryRulesState = {
    queryRules: [],
    modificationState: QueryRuleModificationStatus.None,
    selectedQueryRule: null,
    isLoading: false,
    isUpdating: false,
    receivedAt: Date.now(),
    error: null,
    queryRulesSuccess: false,
};

function queryRuleReducer(state: IQueryRulesState = initialState, action: IActionBase): IQueryRulesState {
    switch (action.type) {
        case REQUEST_QUERY_RULES: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_QUERY_RULES: {
            return {
                ...state,
                queryRules: action.queryRules,
                modificationState: QueryRuleModificationStatus.None,
                isLoading: false,
                receivedAt: Date.now()
            };
        }
        case RECEIVE_QUERY_RULES_SUCCESS: {
            return {
                ...state,
                isLoading: false,
                queryRulesSuccess: action.data
            };
        }
        case RECEIVE_QUERY_RULES_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        case PUT_QUERY_RULE_SUBMITTED: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case PUT_QUERY_RULE_SUCCESS: {
            let updatedQueryRules: IQueryRule[] = state.queryRules;

            switch (action.queryRuleModificationStatus) {
                case QueryRuleModificationStatus.Create: {
                    updatedQueryRules.push(action.queryRule);
                    break;
                }
                case QueryRuleModificationStatus.Edit: {
                    // Find the index of the QueryRule that has been edited in the collection.
                    let index = updatedQueryRules.findIndex(q => q.id === action.queryRule.id);

                    if (index >= 0) {
                        // Update the QueryRule in the collection.
                        updatedQueryRules[index] = action.queryRule;
                    }

                    break;
                }
            }

            // Update the QueryRules collection.
            return {
                ...state,
                queryRules: updatedQueryRules,
                isUpdating: false
            };
        }
        case PUT_QUERY_RULE_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case DELETE_QUERY_RULE_SUBMITTED: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_QUERY_RULE_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                queryRules: state.queryRules.filter(q => q.id !== action.id),
                isUpdating: false
            };
        }
        case DELETE_QUERY_RULE_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CHANGE_SELECTED_QUERY_RULE: {
            return { ...state, selectedQueryRule: action.queryRule };
        }
        case CLEAR_SELECTED_QUERY_RULE: {
            return { ...state, selectedQueryRule: null };
        }
        case SET_QUERY_RULE_MODIFICATION_STATE: {
            return { ...state, modificationState: action.value };
        }
        default:
            // Redux will call our reducer with an undefined state for the first time: https://redux.js.org/basics/reducers#handling-actions
            return state;
    }
}

export default queryRuleReducer;