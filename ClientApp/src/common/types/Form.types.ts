import { IProduct } from "../../store/models/product.interface";
import { QueryRuleType } from "../../store/models/queryruletype";
import { IQueryRuleCondition } from "../../store/models/queryrulecondition.interface";

export type OnChangeModel = {
    value: string | number | boolean,
    error: string,
    touched: boolean,
    field: string
};

export interface IFormStateField<T> {error: string, value: T};

export interface IProductFormState {
    name: IFormStateField<string>;
    description: IFormStateField<string>;
    amount: IFormStateField<number>;
    price: IFormStateField<number>;
    hasExpiryDate: IFormStateField<boolean>; 
    category: IFormStateField<string>;
}

export interface IOrderFormState {
    name: IFormStateField<string>;
    product: IFormStateField<IProduct | null>;
    amount: IFormStateField<number>;
    totalPrice: IFormStateField<number>;
};

export interface IQueryRuleFormState {
    name: IFormStateField<string>;
    type: IFormStateField<QueryRuleType>;
    payload: IFormStateField<string>;
    payload2: IFormStateField<string>;
    datestart: IFormStateField<string>;
    dateend: IFormStateField<string>;
    profiles: IFormStateField<string[]>;
    conditions: IFormStateField<IQueryRuleCondition[]>;
}