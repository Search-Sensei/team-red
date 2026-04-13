import React, { Dispatch, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "./App.css";
import { AccountRoute } from "./common/components/AccountRoute";
import { PrivateRoute } from "./common/components/PrivateRoute";
import Login from "./components/Account/Login";
import Admin from "./components/Admin/Admin";
import Register from "./components/Portal/Register";
import { getAdminSettings } from "./store/actions/adminsettings.actions";
import { IAccount } from "./store/models/account.interface";
import { IAdminSettingsState } from "./store/models/adminsettingsstate.interface";
import { IStateType } from "./store/models/root.interface";
import "./styles/sb-admin-2.min.css";

const isPortalRoute = window.location.pathname.startsWith("/portal");

const PortalApp: React.FC = () => (
    <div className="App" id="wrapper">
        <Router basename="/portal">
            <Switch>
                <Route path="/register" component={Register} />
            </Switch>
        </Router>
    </div>
);

const AdminApp: React.FC = () => {
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector((state: IStateType) => state.adminSettingsState);
    const account: IAccount = useSelector((state: IStateType) => state.account);
    const defaultTitle: string = "OSP Search Administration";

    useEffect(() => {
        // Only get the settings when the user has authenticated or if authentication is disabled.
        if (account.isAuthenticated) {
            dispatch(getAdminSettings());
        }
    }, [dispatch, account.isAuthenticated]);

    useEffect(() => {
        // Get the title from settings.
        var title = adminSettingsState.adminSettings?.applicationTitle || defaultTitle;
        document.title = title;
    }, [adminSettingsState.adminSettings, adminSettingsState.adminSettings.applicationTitle]);

    return (
        <div className="App" id="wrapper">
            <Router basename="/adminui">
                <Switch>
                    <PrivateRoute path="/">
                        <Admin />
                    </PrivateRoute>
                    <AccountRoute path="/login"><Login /></AccountRoute>
                </Switch>
            </Router>
        </div>
    );
};

const App: React.FC = () => {
    if (isPortalRoute) {
        return <PortalApp />;
    }
    return <AdminApp />;
};

export default App;
