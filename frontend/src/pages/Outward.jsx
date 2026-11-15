
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ScanBarcode, Trash2, Package, RefreshCw } from "lucide-react";

const API = "https://ss-inventory.onrender.com/api/outward";

function Outward() {
    const [customerName, setCustomerName] = useState("");
    const [barcode, setBarcode] = useState("");
    const [scannedItems, setScannedItems] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const barcodeRef = useRef(null);

    useEffect(() => {
        barcodeRef.current?.focus();
    }, []);

    // Scan barcode and fetch tool details
    const handleBarcodeScan = async (e) => {
        e.preventDefault();

        const scannedBarcode = barcode.trim();

        if (!scannedBarcode) return;

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const response = await axios.get(
                `${API}/barcode/${encodeURIComponent(scannedBarcode)}`
            );

            const part = response.data.part;

            if (part.availableStock <= 0) {
                setError(`${part.partNo} is out of stock.`);
                setBarcode("");
                return;
            }

            setScannedItems((prev) => {
                const existing = prev.find(
                    item => item._id === part._id
                );

                if (existing) {
                    if (existing.issueQty >= part.availableStock) {
                        setError(`Available stock limit reached for ${part.partNo}.`);
                        return prev;
                    }

                    return prev.map(item =>
                        item._id === part._id
                            ? { ...item, issueQty: item.issueQty + 1 }
                            : item
                    );
                }

                return [
                    ...prev,
                    {
                        ...part,
                        issueQty: 1
                    }
                ];
            });

            setBarcode("");

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Tool not found. Please scan a valid barcode."
            );
            setBarcode("");
        } finally {
            setLoading(false);
            barcodeRef.current?.focus();
        }
    };

    // Remove scanned tool
    const handleRemoveItem = (partId) => {
        setScannedItems(prev =>
            prev.filter(item => item._id !== partId)
        );
    };

    // Submit outward issue
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!customerName.trim()) {
            setError("Please enter customer name.");
            return;
        }

        if (scannedItems.length === 0) {
            setError("Please scan at least one tool.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const response = await axios.post(API, {
                customerName: customerName.trim(),
                items: scannedItems.map(item => ({
                    partId: item._id,
                    quantity: item.issueQty
                }))
            });

            setSuccess(
                `Successfully issued ${response.data.totalTools} tool(s) to ${customerName}.`
            );

            setCustomerName("");
            setScannedItems([]);
            setBarcode("");

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to submit outward issue."
            );
        } finally {
            setSubmitting(false);
            barcodeRef.current?.focus();
        }
    };

    const totalTools = scannedItems.reduce(
        (sum, item) => sum + item.issueQty,
        0
    );

    return (
        <div className="dashboard-content">

            <div className="parts-heading">
                <div>
                    <h2>Outward / Tool Issue</h2>
                    <p>Scan tools and issue them to customers.</p>
                </div>

                <button
                    type="button"
                    className="refresh-btn"
                    onClick={() => {
                        setScannedItems([]);
                        setError("");
                        setSuccess("");
                        setBarcode("");
                        barcodeRef.current?.focus();
                    }}
                >
                    <RefreshCw size={16} />
                    Reset
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {success && (
                <div className="parts-success">
                    {success}
                </div>
            )}

            <div className="parts-table-card" style={{ padding: "24px" }}>

                <form onSubmit={handleSubmit}>

                    <div className="form-field">
                        <label>Customer Name *</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            placeholder="Enter customer name"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label>Scan Tool Barcode *</label>

                        <div style={{
                            display: "flex",
                            gap: "10px"
                        }}>
                            <input
                                ref={barcodeRef}
                                type="text"
                                value={barcode}
                                onChange={e => setBarcode(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        handleBarcodeScan(e);
                                    }
                                }}
                                placeholder="Scan or enter barcode and press Enter"
                                autoComplete="off"
                            />

                            <button
                                type="button"
                                className="add-part-btn"
                                onClick={handleBarcodeScan}
                                disabled={loading || !barcode.trim()}
                            >
                                <ScanBarcode size={17} />
                                {loading ? "Searching..." : "Scan"}
                            </button>
                        </div>
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        margin: "25px 0 15px"
                    }}>
                        <div>
                            <h3>Scanned Tools</h3>
                            <p>Review tools before submitting.</p>
                        </div>

                        <div className="quantity-badge">
                            Total Tools: {totalTools}
                        </div>
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Part Number</th>
                                    <th>Description</th>
                                    <th>Available Stock</th>
                                    <th>Issue Quantity</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {scannedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: "center" }}>
                                            No tools scanned yet.
                                        </td>
                                    </tr>
                                ) : (
                                    scannedItems.map(item => (
                                        <tr key={item._id}>
                                            <td>{item.partNo}</td>
                                            <td>{item.description}</td>
                                            <td>{item.availableStock}</td>
                                            <td>
                                                <span className="quantity-badge">
                                                    {item.issueQty}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="refresh-btn"
                                                    onClick={() => handleRemoveItem(item._id)}
                                                >
                                                    <Trash2 size={15} />
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "25px"
                    }}>
                        <button
                            type="submit"
                            className="add-part-btn"
                            disabled={submitting || scannedItems.length === 0}
                        >
                            <Package size={17} />
                            {submitting ? "Submitting..." : "Submit Outward"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default Outward;
