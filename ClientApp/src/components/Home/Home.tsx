import React, { Dispatch, Fragment, useState, } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoadingIndicator from "../../common/components/LoadingIndicator";
import TopCard from "../../common/components/TopCard";
import { MessageAlertType } from "../../common/types/MessageAlert.types";
import { updateCurrentPath } from "../../store/actions/root.actions";
//import { IProductState, IStateType } from "../../store/models/root.interface";
//import ProductList from "../Products/ProductsList";
//import { IOrder } from "../../store/models/order.interface";
//import OrderList from "../Orders/OrderList";
import { IQueryRule } from "../../store/models/queryrule.interface";
import { QueryRuleType } from "../../store/models/queryruletype";
import { IStateType } from "../../store/models/root.interface";
import QueryRulesMessageAlert from "../QueryRules/QueryRuleMessageAlert";
import QueryRulesList from "../QueryRules/QueryRulesList";

const Home: React.FC = () => {
    //const products: IProductState = useSelector((state: IStateType) => state.products);
    //const numberItemsCount: number = products.products.length;
    //const totalPrice: number = products.products.reduce((prev, next) => prev + ((next.price * next.amount) || 0), 0);
    //const totalProductAmount: number = products.products.reduce((prev, next) => prev + (next.amount || 0), 0);

    //const orders: IOrder[] = useSelector((state: IStateType) => state.orders.orders);
    //const totalSales: number = orders.reduce((prev, next) => prev + next.totalPrice, 0);
    //const totalOrderAmount: number = orders.reduce((prev, next) => prev + next.amount, 0);

    // QueryRules.
    const queryRulesState = useSelector((state: IStateType) => state.queryRulesState);
    const controlPain = useSelector((state: IStateType) => state.controlPain);

    
    const [handleViewAwait, setHandleViewAwait] = useState(false);

    const queryRules: IQueryRule[] = queryRulesState.queryRules;
    const features: IQueryRule[] = queryRules.filter(q => q.type === QueryRuleType.Feature);
    const boosts: IQueryRule[] = queryRules.filter(q => q.type === QueryRuleType.Boost);

    function getQueryRuleTitle(queryRuleType: QueryRuleType = QueryRuleType.Feature): string {
        const queryRuleTypeTitle: string = queryRuleType === QueryRuleType.Feature ? "Featured Content" : "Boosts and Blocks";
        return queryRuleTypeTitle
    }

    const dispatch: Dispatch<any> = useDispatch();
    dispatch(updateCurrentPath("home", ""));

    // If a redirect has been stored for post login then redirect now.
    const redirectUrl = useSelector((state: IStateType) => state.root.redirectUrl);
    if (redirectUrl) {
        window.location.href = redirectUrl;
    }

    setTimeout(() => {
       setHandleViewAwait(true);
    }, 1000);

    return (
        <Fragment>
            <h1 className="h3 mb-2 text-gray-800">Dashboard</h1>
            <p className="mb-4">Summary and overview of Featured Content and Boost and Blocks items</p>

            <QueryRulesMessageAlert key={queryRulesState.error} type={MessageAlertType.Error} message={queryRulesState.error} />

            <LoadingIndicator isLoading={queryRulesState.isLoading || controlPain.isLoading} />

            <div className="row">
                <TopCard title={getQueryRuleTitle(QueryRuleType.Feature)} text={`${features.length}`} icon="newspaper" class="primary" />
                <TopCard title={getQueryRuleTitle(QueryRuleType.Boost)} text={`${boosts.length}`} icon="arrow-circle-up" class="primary" />
            </div>

            {
                //<div className="row">
                //    <TopCard title="PRODUCT COUNT" text={`${numberItemsCount}`} icon="box" class="primary" />
                //    <TopCard title="PRODUCT AMOUNT" text={`${totalProductAmount}`} icon="warehouse" class="danger" />
                //    <TopCard title="SUMMARY PRICE" text={`$${totalPrice}`} icon="dollar-sign" class="success" />
                //</div>

                //<div className="row">
                //    <TopCard title="SALES" text={totalSales.toString()} icon="donate" class="primary" />
                //    <TopCard title="ORDER AMOUNT" text={totalOrderAmount.toString()} icon="calculator" class="danger" />
                //</div>
            }


            <div className="row">

                <div className="col-xl-6 col-lg-6">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold">{getQueryRuleTitle(QueryRuleType.Feature)}</h6>
                        </div>
                        <div className="card-body">
                            {handleViewAwait ? (<QueryRulesList queryRuleType={QueryRuleType.Feature} isReadOnly={true} />): (<div>Loading...</div>)}
                        </div>
                    </div>
                </div>

                <div className="col-xl-6 col-lg-6">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold">{getQueryRuleTitle(QueryRuleType.Boost)}</h6>
                        </div>
                        <div className="card-body">
                             {handleViewAwait ? (<QueryRulesList queryRuleType={QueryRuleType.Boost} isReadOnly={true} />): (<div>Loading...</div>)}
                        </div>
                    </div>
                </div>

                {
                    //    <div className="col-xl-6 col-lg-6">
                    //        <div className="card shadow mb-4">
                    //            <div className="card-header py-3">
                    //                <h6 className="m-0 font-weight-bold">Product list</h6>
                    //            </div>
                    //            <div className="card-body">
                    //                <ProductList />
                    //            </div>
                    //        </div>

                    //    </div>

                    //    <div className="col-xl-6 col-lg-6">
                    //        <div className="card shadow mb-4">
                    //            <div className="card-header py-3">
                    //                <h6 className="m-0 font-weight-bold">Order list</h6>
                    //            </div>
                    //            <div className="card-body">
                    //                <OrderList />
                    //            </div>
                    //        </div>
                    //    </div>
                }

            </div>

        </Fragment>
    );
};

export default Home;
