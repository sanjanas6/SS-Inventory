
import {
    LayoutDashboard,
    Package,
    Upload,
    PackageMinus,
    ClipboardList
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuItems = [
    {
        name: "Dashboard",
        icon: LayoutDashboard,
        path: "/",
        roles: ["ADMIN"]
    },
    {
        name: "Parts Master",
        icon: Package,
        path: "/parts",
        roles: ["ADMIN"]
    },
    {
        name: "Excel Import",
        icon: Upload,
        path: "/import",
        roles: ["ADMIN"]
    },
    {
        name: "Stock Outward",
        icon: PackageMinus,
        path: "/stock-out",
        roles: ["ADMIN", "STORE_MANAGER"]
    },
    {
        name: "Transactions",
        icon: ClipboardList,
        path: "/transactions",
        roles: ["ADMIN", "STORE_MANAGER"]
    }
];

function Sidebar() {
    const { user } = useAuth();

    const visibleMenuItems = menuItems.filter(item =>
        item.roles.includes(user?.role)
    );

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
                {visibleMenuItems.map((item) => {
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
                <div className="user-avatar">
                    {user?.username?.charAt(0).toUpperCase()}
                </div>

                <div>
                    <strong>{user?.username}</strong>
                    <span>
                        {user?.role === "ADMIN"
                            ? "Administrator"
                            : "Store Manager"}
                    </span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
