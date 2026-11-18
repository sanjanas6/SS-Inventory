
import { useEffect, useState } from "react";
import axios from "axios";
import {
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Download
} from "lucide-react";

const API = "https://ss-inventory.onrender.com/api/transactions";

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(API, {
                params: {
                    page,
                    limit: 20,
                    search,
                }
            });

            setTransactions(response.data.transactions);
            setTotal(response.data.total);
            setTotalPages(response.data.totalPages);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load transactions."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page, search]);

    const formatDate = (date) => {
        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };


    const handleExportCSV = async () => {
        try {
            setExporting(true);
            setError("");

            // Fetch ALL matching transactions, not just current page
            const response = await axios.get(`${API}/export`, {
                params: { search }
            });

            const allTransactions = response.data.transactions || [];

            if (allTransactions.length === 0) {
                setError("No transactions available to export.");
                return;
            }

            const headers = [
                "Issue Date",
                "VRN / Vehicle No.",
                "Manual No.",
                "Part Number",
                "Description",
                "Quantity",
                "Customer Name",
                "Issued By",
                "Location"
            ];

            const escapeCSV = (value) => {
                let text = String(value ?? "");

                // Prevent spreadsheet formula injection
                if (/^[=+\-@\t\r]/.test(text)) {
                    text = "'" + text;
                }

                return `"${text.replace(/"/g, '""')}"`;
            };

            const rows = allTransactions.map(transaction => [
                transaction.issueDate
                    ? new Date(transaction.issueDate).toLocaleDateString("en-IN")
                    : "-",
                transaction.vrn || "-",
                transaction.manualNo || "-",
                transaction.part?.partNo || "-",
                transaction.part?.description || "-",
                transaction.quantity ?? 0,
                transaction.customerName || "-",
                transaction.issuedBy || "-",
                transaction.location || "-"
            ]);

            const csvContent = [
                headers.map(escapeCSV).join(","),
                ...rows.map(row => row.map(escapeCSV).join(","))
            ].join("\r\n");

            // BOM helps Excel display CSV correctly
            const blob = new Blob(
                ["\uFEFF" + csvContent],
                { type: "text/csv;charset=utf-8;" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `SS-Motors-Transactions-${new Date().toISOString().slice(0, 10)}.csv`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to export transactions."
            );
        } finally {
            setExporting(false);
        }
    };


    return (
        <div className="parts-page">

            <div className="parts-heading">
                <div>
                    <h2>Outward Transactions</h2>
                    <p>Track all tools issued to customers.</p>
                </div>

                <div className="parts-actions">
                    <button
                        className="refresh-btn"
                        onClick={handleExportCSV}
                        disabled={exporting || loading}
                    >
                        <Download size={16} />
                        {exporting ? "Exporting..." : "Export CSV"}
                    </button>

                    <button
                        className="refresh-btn"
                        onClick={fetchTransactions}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">{error}</div>
            )}

            <div className="parts-summary">
                <div>
                    <span>Total Transactions</span>
                    <h2>{total}</h2>
                </div>
            </div>

            <div className="parts-table-card">

                <div className="parts-toolbar">
                    <div>
                        <h3>Transaction History</h3>
                        <p>All tools issued to customers.</p>
                    </div>

                    <div className="parts-actions">

                        <div className="parts-search">
                            <Search size={18} />
                            <input
                                placeholder="Search part, customer, location..."
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                    </div>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Issue Date</th>
                                <th>VRN / Vehicle No.</th>
                                <th>Manual No.</th>
                                <th>Part Number</th>
                                <th>Description</th>
                                <th>MRP</th>
                                <th>Quantity</th>
                                <th>Customer Name</th>
                                <th>Issued By</th>
                                <th>Location</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8">Loading transactions...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="8">No transactions found.</td>
                                </tr>
                            ) : (
                                transactions.map(transaction => (
                                    <tr key={transaction._id}>
                                        <td>
                                            {transaction.issueDate
                                                ? new Date(transaction.issueDate).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                })
                                                : "-"}
                                        </td>

                                        <td>{transaction.vrn || "-"}</td>

                                        <td>{transaction.manualNo || "-"}</td>

                                        <td className="part-number">
                                            {transaction.part?.partNo || "-"}
                                        </td>

                                        <td>
                                            {transaction.part?.description || "-"}
                                        </td>

                                        <td>{transaction.mrp}</td>
                                        <td>{transaction.quantity}</td>

                                        <td>{transaction.customerName || "-"}</td>

                                        <td>{transaction.issuedBy || "-"}</td>

                                        <td>{transaction.location || "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination">
                    <span>
                        Showing {transactions.length} of {total} transactions
                    </span>

                    <div>
                        <button
                            disabled={page <= 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span>
                            Page {page} of {totalPages || 1}
                        </span>

                        <button
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Transactions;
