import { createStore, applyMiddleware, Store, compose } from "redux";
import thunkMiddleware from "redux-thunk";
import rootReducers from "./reducers/root.reducer";

declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
    }
}

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store: Store = createStore(
    rootReducers,
    composeEnhancers(
        applyMiddleware(thunkMiddleware)
    )
);

store.subscribe(() => { });
export default store;