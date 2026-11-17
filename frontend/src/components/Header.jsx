
import { Search, Bell, Menu, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Header() {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <header className="header">
            <div>
                <button className="mobile-menu">
                    <Menu size={22} />
                </button>

                <h2>Inventory Management</h2>
                <p>Welcome back, {user?.username}!</p>
            </div>

            <div className="header-actions">
                <div className="search-box">
                    <Search size={18} />
                    <input placeholder="Search anything..." />
                </div>

                <button className="notification-btn">
                    <Bell size={20} />
                </button>

                <div className="header-avatar">
                    {user?.username?.charAt(0).toUpperCase()}
                </div>

                <div className="header-user-info">
                    <strong>{user?.username}</strong>
                    <span>
                        {user?.role === "ADMIN" ? "Administrator" : "Store Manager"}
                    </span>
                </div>

                <button
                    type="button"
                    className="refresh-btn"
                    onClick={handleLogout}
                    title="Logout"
                >
                    <LogOut size={17} />
                    Logout
                </button>
            </div>
        </header>
    );
}

export default Header;
