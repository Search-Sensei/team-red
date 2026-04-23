import React, { useState } from "react";

const SupportMenu = () => {
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <li className="nav-item subMenu">
      <div className="nav-link" onClick={() => setOpenMenu(!openMenu)}>
        <i className="fas fa-fw fa-arrow-circle-up"></i>
        <span>Support</span>
      </div>
      <a
        className={`subMenu-item nav-link  ${openMenu && "d-block"}`}
        href={process.env.REACT_APP_KNOWLEDGE_BASE_LINK}
        target="_blank"
        rel="noreferrer"
      >
        Documentation
      </a>
    </li>
  );
};

export default SupportMenu;
