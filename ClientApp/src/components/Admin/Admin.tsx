import React, { Dispatch, Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Switch, Route } from "react-router";
import Notifications from "../../common/components/Notification";
import { PrivateRoute } from "../../common/components/PrivateRoute";
import { getQueryRules } from "../../store/actions/queryrules.actions";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { QueryRuleType } from "../../store/models/queryruletype";
import { IStateType } from "../../store/models/root.interface";
import Home from "../Home/Home";
import LeftMenu from "../LeftMenu/LeftMenu";
import Orders from "../Orders/Orders";
import Products from "../Products/Products";
import QueryRules from "../QueryRules/QueryRules";
import TopMenu from "../TopMenu/TopMenu";
import Users from "../Users/Users";
import StartURLs from "../Crawler/StartURLs/StartURLs";
import Setting from "../Setting/Setting";
import CustomerBilling from "../CustomerBilling/CustomerBilling";


const Admin: React.FC = () => {
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector((state: IStateType) => state.adminSettingsState);

    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;

        if (baseApiUrl?.length > 0) {
            dispatch(getQueryRules(baseApiUrl));
        }
    }, [adminSettingsState.adminSettings.searchAdminApiUrl, dispatch]);

    return (
        <Fragment>
            <Notifications />
            <LeftMenu />
            <div id="content-wrapper" className="d-flex flex-column">
                <div id="content">
                    <TopMenu />
                    <div className="container-fluid">
                        <Switch>
                            <PrivateRoute path={`/users`}><Users /></PrivateRoute>
                            <PrivateRoute path={`/products`}><Products /></PrivateRoute>
                            <PrivateRoute path={`/orders`}><Orders /></PrivateRoute>
                            <PrivateRoute path={`/feature`}>
                                <QueryRules queryRuleType={QueryRuleType.Feature} description="Allows you to update the Features that will be returned from the Search API to display in search results pages." />
                            </PrivateRoute>
                            <PrivateRoute path={`/boost`}>
                                <QueryRules queryRuleType={QueryRuleType.Boost} description="Allows you to update the Boosts and Blocks that will change the search results returned from the Search API." />
                            </PrivateRoute>
                            <PrivateRoute path={`/boost-navigation`}>
                                <QueryRules queryRuleType={QueryRuleType.Boost} description="Allows you to update the Boosts and Blocks that will change the search results returned from the Search API." />
                            </PrivateRoute>
                            <PrivateRoute path={`/synonym`}>
                                <QueryRules queryRuleType={QueryRuleType.Synonym} description="Allows you to update the Synonym that will change the search results returned from the Search API." />
                            </PrivateRoute>
                            <PrivateRoute path={`/control-panel`}>
                                <QueryRules queryRuleType={QueryRuleType.ControlPanel} page="control-pane" description="Search for the URL that you with to delete, select the correct entry and press Delete button . The deletion will be tracked in the logs." />
                            </PrivateRoute>
                            <PrivateRoute path={`/fast-links`}>
                                <QueryRules queryRuleType={QueryRuleType.FastLinks} description="Allows you to update the Fast Link that will change the search results returned from the Search API." />
                            </PrivateRoute>
                            <PrivateRoute path={`/navigation`}>
                                <QueryRules queryRuleType={QueryRuleType.Navigation} description="Allows you to update the Navigation that will change the search results returned from the Search API." />
                            </PrivateRoute>
                            <PrivateRoute path={`/content-enhancement`}>
                                <QueryRules queryRuleType={QueryRuleType.ContentEnhancement} />
                            </PrivateRoute>
                            <PrivateRoute path={`/content-enhancement-detail/:index`}>
                                <QueryRules queryRuleType={QueryRuleType.ContentEnhancementDetail} />
                            </PrivateRoute>
                            <PrivateRoute path={`/user-permission`}>
                                <QueryRules
                                    queryRuleType={QueryRuleType.UserPermission}
                                    description="Allows you to update the Group Permission that will change the search results returned from the Search API."
                                />
                            </PrivateRoute>
                            <PrivateRoute path={`/user-group`}>
                                <QueryRules
                                    queryRuleType={QueryRuleType.UserGroup}
                                    description="Allows you to update the User Group that will change the search results returned from the Search API."
                                />
                            </PrivateRoute>
                            <PrivateRoute path={`/suggestion`}>
                                <QueryRules queryRuleType={QueryRuleType.Suggestion} description="Allows you to update the Suggestion that will change the search results returned from the Search API." />
                            </PrivateRoute>
                            <PrivateRoute path={`/start-urls`}>
                                <StartURLs />
                            </PrivateRoute>
                            <PrivateRoute path={`/setting`}>
                                <Setting />
                            </PrivateRoute>
                            <PrivateRoute path={`/customer-billing`}>
                                <CustomerBilling />
                            </PrivateRoute>
                            <PrivateRoute path="/"><Home /></PrivateRoute>
                        </Switch>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Admin;