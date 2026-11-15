
import { useEffect, useState } from "react";
import axios from "axios";

import {
    Search,
    Package,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Barcode,
    Printer,
    Pencil
} from "lucide-react";

const API = "https://ss-inventory.onrender.com/api/parts";

function PartsMaster() {
    const [parts, setParts] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [printingId, setPrintingId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showEditForm, setShowEditForm] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [editSaving, setEditSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        mrp: "",
        location: "",
        quantity: ""
    });

    const [form, setForm] = useState({
        partNo: "",
        description: "",
        mrp: "",
        barcode: "",
        quantity: "0",
        location: ""
    });

    // Fetch Parts
    const fetchParts = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(API, {
                params: {
                    search,
                    page,
                    limit: 20
                }
            });

            setParts(response.data.parts);
            setTotal(response.data.total);
            setTotalPages(response.data.totalPages);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load parts."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParts();
    }, [page, search]);

    // Form Input Change
    const handleFormChange = (e) => {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value,
            ...(name === "partNo" ? { barcode: value.trim() } : {})
        }));
    };

    const handleEditClick = (part) => {
        const firstLocation = part.locations?.[0];

        setEditingPart(part);

        setEditForm({
            mrp: String(part.mrp ?? 0),
            location: firstLocation?.location || "",
            quantity: String(firstLocation?.quantity ?? 0)
        });

        setError("");
        setSuccess("");
        setShowEditForm(true);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;

        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdatePart = async (e) => {
        e.preventDefault();

        if (!editingPart) return;

        try {
            setEditSaving(true);
            setError("");
            setSuccess("");

            const response = await axios.patch(
    `${API}/${editingPart._id}`,
    {
        mrp: Number(editForm.mrp),
        location: editForm.location.trim(),
        quantity: Number(editForm.quantity)
    }
);

            setShowEditForm(false);
            setEditingPart(null);

            setSuccess(response.data.message);

            await fetchParts();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update part details."
            );
        } finally {
            setEditSaving(false);
        }
    };

    // Add New Part
    const handleAddPart = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response = await axios.post(API, {
                partNo: form.partNo,
                description: form.description,
                mrp: Number(form.mrp),
                quantity: Number(form.quantity),
                location: form.location || "UNASSIGNED"
            });

            setSuccess(response.data.message);

            setForm({
                partNo: "",
                description: "",
                mrp: "",
                barcode: "",
                quantity: "0",
                location: ""
            });

            setShowForm(false);
            setSearch("");
            setPage(1);

            await fetchParts();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to add new part."
            );
        } finally {
            setSaving(false);
        }
    };

    // Print One Barcode Label
    const handlePrintBarcode = async (part) => {
        let printWindow = null;
        let imageUrl = null;
        let countUpdated = false;

        try {
            setError("");
            setSuccess("");

            // Open window immediately to avoid popup blocking
            printWindow = window.open(
                "",
                "_blank",
                "width=500,height=400"
            );

            if (!printWindow) {
                setError("Please allow pop-ups to print barcode.");
                return;
            }

            setPrintingId(part._id);

            // Generate barcode image from backend
            const response = await axios.get(
                `${API}/${part._id}/barcode`,
                {
                    responseType: "blob"
                }
            );

            imageUrl = URL.createObjectURL(response.data);

            printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Barcode</title>

            <style>
              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                padding: 15px;
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
              }

              .label {
                width: 300px;
                text-align: center;
              }

              img {
                max-width: 100%;
                height: auto;
              }

              @media print {
                body {
                  padding: 0;
                }

                .label {
                  width: 100%;
                }
              }
            </style>
          </head>

          <body>
            <div class="label">
              <img id="barcodeImage" alt="Barcode" />
            </div>
          </body>
        </html>
      `);

            printWindow.document.close();

            const barcodeImage =
                printWindow.document.getElementById("barcodeImage");

            // When barcode image loads
            barcodeImage.onload = () => {
                if (printWindow.closed) {
                    setPrintingId(null);
                    URL.revokeObjectURL(imageUrl);
                    return;
                }

                // Runs when print dialog closes
                printWindow.onafterprint = async () => {
                    if (countUpdated) return;
                    countUpdated = true;

                    try {
                        // Increment printedCount by exactly 1
                        const countResponse = await axios.post(
                            `${API}/${part._id}/printed`
                        );

                        setSuccess(
                            `Barcode print completed. Printed count: ${countResponse.data.printedCount}`
                        );

                        await fetchParts();

                    } catch (err) {
                        setError(
                            "Print dialog closed, but printed count could not be updated."
                        );
                    } finally {
                        setPrintingId(null);

                        if (imageUrl) {
                            URL.revokeObjectURL(imageUrl);
                        }

                        if (!printWindow.closed) {
                            printWindow.close();
                        }
                    }
                };

                printWindow.focus();
                printWindow.print();
            };

            barcodeImage.onerror = () => {
                setError("Unable to load barcode image.");
                setPrintingId(null);

                if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                }

                if (!printWindow.closed) {
                    printWindow.close();
                }
            };

            barcodeImage.src = imageUrl;

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to print barcode."
            );

            setPrintingId(null);

            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }

            if (printWindow && !printWindow.closed) {
                printWindow.close();
            }
        }
    };

    return (
        <div className="parts-page">
            {showEditForm && editingPart && (
                <div className="modal-overlay">
                    <div className="part-modal">

                        <div className="modal-header">
                            <div>
                                <h3>Edit Part Details</h3>
                                <p>Update stock, location and MRP.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowEditForm(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePart}>

                            <div className="form-field">
                                <label>Part Number</label>
                                <input
                                    value={editingPart.partNo}
                                    readOnly
                                />
                            </div>

                            <div className="form-field">
                                <label>Part Description</label>
                                <input
                                    value={editingPart.description}
                                    readOnly
                                />
                            </div>

                            <div className="form-field">
                                <label>MRP (₹) *</label>
                                <input
                                    type="number"
                                    name="mrp"
                                    value={editForm.mrp}
                                    onChange={handleEditFormChange}
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label>Location *</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={editForm.location}
                                    onChange={handleEditFormChange}
                                    placeholder="Enter location"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label>Available Stock *</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={editForm.quantity}
                                    onChange={handleEditFormChange}
                                    min="0"
                                    step="1"
                                    required
                                />
                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="reset-btn"
                                    onClick={() => setShowEditForm(false)}
                                    disabled={editSaving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="add-part-btn"
                                    disabled={editSaving}
                                >
                                    {editSaving ? "Updating..." : "Save Changes"}
                                </button>

                            </div>

                        </form>

                    </div>
                </div>
            )}
            {/* Page Heading */}
            <div className="parts-heading">
                <div>
                    <h2>Parts Master</h2>
                    <p>Manage all your inventory parts in one place.</p>
                </div>

                <div className="parts-actions">

                    <button
                        className="refresh-btn"
                        onClick={fetchParts}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>

                    <button
                        className="add-part-btn"
                        onClick={() => {
                            setError("");
                            setShowForm(true);
                        }}
                    >
                        <Plus size={18} />
                        Add New Part
                    </button>

                </div>
            </div>

            {/* Success Message */}
            {success && (
                <div className="parts-success">
                    {success}

                    <button onClick={() => setSuccess("")}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Summary */}
            <div className="parts-summary">

                <div className="parts-summary-icon">
                    <Package size={25} />
                </div>

                <div>
                    <span>Total Parts</span>
                    <h2>{total}</h2>
                </div>

            </div>

            {/* Parts Table */}
            <div className="parts-table-card">

                {/* Toolbar */}
                <div className="parts-toolbar">

                    <div>
                        <h3>All Inventory Parts</h3>
                        <p>Browse and manage your parts master.</p>
                    </div>

                    <div className="parts-search">

                        <Search size={18} />

                        <input
                            placeholder="Search part number or description..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />

                    </div>

                </div>

                {/* Table */}
                <div className="table-wrapper">

                    <table>

                        <thead>
                            <tr>
                                <th>Part Number</th>
                                <th>Description</th>
                                <th>MRP</th>
                                <th>Barcode</th>
                                <th>Available Stock</th>
                                <th>Location</th>
                                <th>Printed Count</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>
                                    <td colSpan="8">Loading parts...</td>
                                </tr>

                            ) : parts.length === 0 ? (

                                <tr>
                                    <td colSpan="8">No parts found.</td>
                                </tr>

                            ) : (

                                parts.map(part => (

                                    <tr key={part._id}>

                                        <td className="part-number">
                                            {part.partNo}
                                        </td>

                                        <td>
                                            {part.description}
                                        </td>

                                        <td>
                                            ₹{Number(part.mrp).toLocaleString("en-IN")}
                                        </td>

                                        <td className="barcode-value">
                                            <Barcode size={16} />
                                            {part.barcode}
                                        </td>

                                        <td>
                                            <span className="quantity-badge">
                                                {part.availableStock}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="location-list">

                                                {part.locations?.map((loc, index) => (
                                                    <span key={index}>
                                                        {loc.location} ({loc.quantity})
                                                    </span>
                                                ))}

                                            </div>
                                        </td>

                                        {/* Printed Count */}
                                        <td>
                                            <span className="quantity-badge">
                                                {part.printedCount ?? 0}
                                            </span>
                                        </td>

                                        {/* Print Barcode Button */}
                                        <td>
                                            <div className="parts-actions">
                                                <button
                                                    type="button"
                                                    className="refresh-btn"
                                                    onClick={() => handleEditClick(part)}
                                                >
                                                    <Pencil size={15} />
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="refresh-btn"
                                                    onClick={() => handlePrintBarcode(part)}
                                                    disabled={printingId === part._id}
                                                >
                                                    <Printer size={15} />
                                                    {printingId === part._id ? "Printing..." : "Print"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

                {/* Pagination */}
                <div className="pagination">

                    <span>
                        Showing {parts.length} of {total} parts
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

            {/* Add New Part Modal */}
            {showForm && (

                <div className="modal-overlay">

                    <div className="part-modal">

                        <div className="modal-header">

                            <div>
                                <h3>Add New Part</h3>
                                <p>Enter new inventory part details.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                            >
                                <X size={20} />
                            </button>

                        </div>

                        <form onSubmit={handleAddPart}>

                            <div className="form-field">

                                <label>Part Number *</label>

                                <input
                                    name="partNo"
                                    value={form.partNo}
                                    onChange={handleFormChange}
                                    placeholder="Enter part number"
                                    required
                                    maxLength={100}
                                />

                            </div>

                            <div className="form-field">

                                <label>Part Description *</label>

                                <input
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    placeholder="Enter part description"
                                    required
                                    maxLength={500}
                                />

                            </div>

                            <div className="form-row">

                                <div className="form-field">

                                    <label>MRP (₹) *</label>

                                    <input
                                        type="number"
                                        name="mrp"
                                        value={form.mrp}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="0.01"
                                        required
                                    />

                                </div>

                                <div className="form-field">

                                    <label>Opening Quantity *</label>

                                    <input
                                        type="number"
                                        name="quantity"
                                        value={form.quantity}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1"
                                        required
                                    />

                                </div>

                            </div>

                            <div className="form-field">

                                <label>Location</label>

                                <input
                                    name="location"
                                    value={form.location}
                                    onChange={handleFormChange}
                                    placeholder="e.g. N-1"
                                />

                            </div>

                            <div className="form-field">

                                <label>Barcode</label>

                                <input
                                    value={form.barcode}
                                    readOnly
                                    placeholder="Automatically generated from Part Number"
                                />

                                <small>
                                    Part Number will be used as barcode value.
                                </small>

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="reset-btn"
                                    onClick={() => setShowForm(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="add-part-btn"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save Part"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default PartsMaster;