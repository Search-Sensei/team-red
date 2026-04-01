import React, { Fragment } from "react";
import UrlList from "./UrlList";

const StartURLs: React.FC = () => {

    return (
            <Fragment>
                <h1 className="h3 mb-2 text-gray-800">Start URLs</h1>
                <p className="mb-4">URL List</p>
                <div className="row">
                    <div className="col-xl-12 col-lg-12">
                        <div className="card shadow mb-4">
                            <div className="card-header py-3">
                                <h6 className="m-0 font-weight-bold">URLs List</h6>
                                <div className="header-buttons">
                                    <button className="btn btn-success btn-green">
                                        <i className="fas fa fa-plus"></i>
                                    </button>
                                    <button className="btn btn-success btn-blue">
                                        <i className="fas fa fa-pen"></i>
                                    </button>
                                    <button className="btn btn-success btn-red">
                                        <i className="fas fa fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <UrlList />
                            </div>

                        </div>
                    </div>
                </div>
            </Fragment>
        );
}

export default StartURLs