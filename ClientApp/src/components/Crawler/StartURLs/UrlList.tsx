import React, {} from "react";

const UrlList: React.FC = () => {
    return(
        <div className="table-responsive portlet shadow">
            <table className="table">
                <thead className="thead-dark">
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">URL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>facebook.com</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>uts.ac.id</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>rmit.edu.au</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default UrlList;