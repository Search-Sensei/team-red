import React from "react";

export interface IHeaderProps {
    query: string;
}

const HeaderDTO: React.FC<IHeaderProps> = ({ query }) => {
    return (
        <div style={{ height: 80 }}>
            <h6 className="info-text text-center">
                Select the items to boost or block for '{query}' on the Profile(s) below:
            </h6>
        </div>
    );
};

export default HeaderDTO;
