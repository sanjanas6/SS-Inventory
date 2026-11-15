
import {
  LayoutDashboard,
  Package,
  Upload,
  Barcode,
  PackagePlus,
  PackageMinus,
  ClipboardList,
  Settings
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Parts Master", icon: Package, path: "/parts" },
  { name: "Excel Import", icon: Upload, path: "/import" },
  { name: "Stock Outward", icon: PackageMinus, path: "/stock-out" },
  { name: "Transactions", icon: ClipboardList, path: "/transactions" }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">S</div>
        <div>
          <h2>SS MOTORS</h2>
          <span>Inventory System</span>
        </div>
      </div>

      <p className="menu-label">MAIN MENU</p>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              to={item.path}
              key={item.name}
              end={item.path === "/"}
              className={({ isActive }) =>
                `menu-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">A</div>
        <div>
          <strong>Administrator</strong>
          <span>Store Manager</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
