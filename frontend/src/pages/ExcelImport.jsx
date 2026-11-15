
import { useState } from "react";
import axios from "axios";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    X,
    RefreshCw
} from "lucide-react";
import { useRef } from "react";

function ExcelImport() {
    const [file, setFile] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];

        if (!selectedFile) return;

        if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
            setError("Please select a valid Excel file.");
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            setError("File size must be less than 5 MB.");
            return;
        }

        setFile(selectedFile);
        setData(null);
        setError("");
    };

    const handlePreview = async () => {
        if (!file) {
            setError("Please select an Excel file first.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post(
                "http://localhost:5000/api/import/preview",
                formData
            );

            setData(response.data);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to generate Excel preview."
            );
        } finally {
            setLoading(false);
        }
    };


    const handleConfirmImport = async () => {
        if (!file || !data) {
            setError("Please generate Excel preview first.");
            return;
        }

        if (data.summary.invalidRows > 0) {
            setError("Please fix all invalid records before importing.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to import ${data.summary.validRows} parts into MongoDB?`
        );

        if (!confirmed) return;

        try {
            setImporting(true);
            setError("");
            setImportResult(null);

            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post(
                "http://localhost:5000/api/import/excel",
                formData
            );

            setImportResult(response.data);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Inventory import failed."
            );
        } finally {
            setImporting(false);
        }
    };


    const resetPreview = () => {
        setFile(null);
        setData(null);
        setError("");
        setImportResult(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    return (
        <div className="import-page">

            <div className="import-heading">
                <div>
                    <h2>Excel Import</h2>
                    <p>Upload and validate your inventory data before importing.</p>
                </div>
            </div>

            {/* Upload Section */}

            <div className="upload-card">

                <div className="upload-icon">
                    <FileSpreadsheet size={32} />
                </div>

                <h3>Upload Inventory Excel</h3>

                <p>
                    Select your inventory Excel file to preview
                    and validate the records.
                </p>

                <label className="upload-area">
                    <Upload size={28} />

                    <strong>
                        Click to browse Excel file
                    </strong>

                    <span>
                        Supported formats: .xlsx, .xls (Maximum 5 MB)
                    </span>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        hidden
                    />
                </label>

                {file && (
                    <div className="selected-file">
                        <FileSpreadsheet size={22} />

                        <div>
                            <strong>{file.name}</strong>
                            <span>
                                {(file.size / 1024).toFixed(2)} KB
                            </span>
                        </div>

                        <button onClick={resetPreview}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <button
                    className="preview-btn"
                    onClick={handlePreview}
                    disabled={!file || loading}
                >
                    {loading ? (
                        <>
                            <RefreshCw size={18} className="spin" />
                            Generating Preview...
                        </>
                    ) : (
                        <>
                            <Upload size={18} />
                            Generate Preview
                        </>
                    )}
                </button>

            </div>

            {/* Preview Summary */}

            {data && (
                <>
                    <div className="preview-heading">
                        <div>
                            <h3>Import Validation Summary</h3>
                            <p>Review your Excel records before importing.</p>
                        </div>

                        <span className="success-label">
                            <CheckCircle size={16} />
                            Preview Generated
                        </span>
                    </div>

                    <div className="import-stats">

                        <div className="import-stat">
                            <span>Total Records</span>
                            <h2>{data.summary.totalRows}</h2>
                        </div>

                        <div className="import-stat valid">
                            <span>Valid Records</span>
                            <h2>{data.summary.validRows}</h2>
                        </div>

                        <div className="import-stat invalid">
                            <span>Invalid Records</span>
                            <h2>{data.summary.invalidRows}</h2>
                        </div>

                        <div className="import-stat warning">
                            <span>Unassigned Locations</span>
                            <h2>{data.summary.unassignedLocations}</h2>
                        </div>

                    </div>

                    {/* Data Table */}

                    <div className="preview-table-card">

                        <div className="table-title">
                            <div>
                                <h3>Excel Data Preview</h3>
                                <p>Showing {data.preview.length} records</p>
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Excel Row</th>
                                        <th>Part Number</th>
                                        <th>Description</th>
                                        <th>Quantity</th>
                                        <th>MRP</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.preview.map((item) => (
                                        <tr
                                            key={item.excelRow}
                                            className={
                                                item.status === "INVALID"
                                                    ? "invalid-row"
                                                    : ""
                                            }
                                        >
                                            <td>{item.excelRow}</td>
                                            <td className="part-number">
                                                {item.partNo}
                                            </td>
                                            <td>{item.description || "-"}</td>
                                            <td>{item.quantity ?? "-"}</td>
                                            <td>
                                                {Number.isFinite(item.mrp)
                                                    ? `₹${item.mrp.toLocaleString("en-IN")}`
                                                    : "-"}
                                            </td>
                                            <td>{item.location}</td>
                                            <td>
                                                <span className={
                                                    item.status === "VALID"
                                                        ? "stock-badge"
                                                        : "invalid-badge"
                                                }>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>

                    {/* Validation Errors */}

                    {data.errors?.length > 0 && (
                        <div className="validation-card">
                            <h3>
                                <AlertCircle size={19} />
                                Records Requiring Attention
                            </h3>

                            {data.errors.map((item) => (
                                <div
                                    className="validation-item"
                                    key={item.excelRow}
                                >
                                    <strong>Excel Row {item.excelRow}</strong>
                                    <span>{item.partNo}</span>
                                    <span>{item.errors.join(", ")}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="preview-footer">
                        <button
                            className="reset-btn"
                            onClick={resetPreview}
                        >
                            Reset
                        </button>

                        <button
                            className="preview-btn"
                            onClick={handleConfirmImport}
                            disabled={
                                importing ||
                                !data ||
                                data.summary.validRows === 0 ||
                                data.summary.invalidRows > 0 ||
                                !!importResult
                            }
                        >
                            {importing ? "Importing..." : "Confirm Import"}
                        </button>
                    </div>
                    {importResult && (
                        <div className="import-success">
                            <CheckCircle size={24} />

                            <div>
                                <h3>Inventory Imported Successfully!</h3>

                                <p>{importResult.message}</p>

                                <strong>
                                    {importResult.summary.totalImported} parts imported
                                </strong>

                                <p>
                                    Total Opening Quantity:{" "}
                                    {importResult.summary.totalQuantity}
                                </p>
                            </div>
                        </div>
                    )}

                </>
            )}

        </div>
    );
}

export default ExcelImport;
