
import { useEffect, useState } from "react";
import axios from "axios";

import {
  Package,
  Boxes,
  IndianRupee,
  AlertTriangle,
  ArrowDownRight,
  Plus,
  Upload,
  Barcode
} from "lucide-react";

const API = "https://ss-inventory.onrender.com/api/dashboard/summary";

function Dashboard() {
  const [stats, setStats] = useState({
    totalParts: 0,
    totalStock: 0,
    totalStockValue: 0,
    lowStockItems: 0
  });

  const [recentParts, setRecentParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API);

      setStats(response.data.stats);
      setRecentParts(response.data.recentParts);

    } catch (err) {
      console.error("Dashboard Error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    });
  };

  const statCards = [
    {
      title: "Total Parts",
      value: stats.totalParts.toLocaleString("en-IN"),
      note: "Parts in master list",
      icon: Package,
      color: "blue"
    },
    {
      title: "Total Stock",
      value: stats.totalStock.toLocaleString("en-IN"),
      note: "Available quantity",
      icon: Boxes,
      color: "green"
    },
    {
      title: "Total Stock Value",
      value: formatCurrency(stats.totalStockValue),
      note: "Based on available stock × MRP",
      icon: IndianRupee,
      color: "purple"
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems.toLocaleString("en-IN"),
      note: "Stock quantity ≤ 5",
      icon: AlertTriangle,
      color: "orange"
    }
  ];

  return (
    <div className="dashboard-content">

      {/* Dashboard Stats */}
      <div className="stats-grid">

        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div className="stat-card" key={item.title}>

              <div className={`stat-icon ${item.color}`}>
                <Icon size={23} />
              </div>

              <p>{item.title}</p>

              <h2>
                {loading ? "..." : item.value}
              </h2>

              <span>{item.note}</span>

            </div>
          );
        })}

      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}

          <button onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* Recent Inventory */}
      <div className="table-section">

        <div className="section-heading">

          <div>
            <h3>Recent Inventory</h3>
            <p>Latest inventory records from your database</p>
          </div>

          <button
            className="view-btn"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            Refresh
          </button>

        </div>

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Part Number</th>
                <th>Description</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>MRP</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="6">
                    Loading inventory...
                  </td>
                </tr>

              ) : recentParts.length === 0 ? (

                <tr>
                  <td colSpan="6">
                    No inventory records found.
                  </td>
                </tr>

              ) : (

                recentParts.map((part) => (

                  <tr key={part._id}>

                    <td className="part-number">
                      {part.partNo}
                    </td>

                    <td>
                      {part.description}
                    </td>

                    <td>
                      {part.location}
                    </td>

                    <td>
                      {part.quantity}
                    </td>

                    <td>
                      {formatCurrency(part.mrp)}
                    </td>

                    <td>
                      <span className="stock-badge">
                        {part.quantity <= 5
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
