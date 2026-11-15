
import { Search, Bell, Menu } from "lucide-react";

function Header() {
  return (
    <header className="header">
      <div>
        <button className="mobile-menu">
          <Menu size={22} />
        </button>
        <h2>Dashboard</h2>
        <p>Welcome back! Here's your inventory overview.</p>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search anything..." />
        </div>

        <button className="notification-btn">
          <Bell size={20} />
        </button>

        <div className="header-avatar">A</div>
      </div>
    </header>
  );
}

export default Header;
 