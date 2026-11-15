
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");

const Part = require("../models/Part");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Excel Import API is working!"
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(xlsx|xls)$/i.test(file.originalname);

    if (!allowed) {
      return cb(new Error("Only Excel files are allowed"));
    }

    cb(null, true);
  }
});

function cleanPartNo(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : String(value);
  }

  return String(value).trim();
}


router.post("/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel file"
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer"
    });

    const sheetName = workbook.SheetNames[0];

    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { defval: null }
    );

    const preview = [];
    const errors = [];

    rows.forEach((row, index) => {
      const partNo = String(
        row["PART NO"] ?? row["PART NO "] ?? ""
      ).trim();

      if (!partNo) return;

      const description = String(
        row["Part description"] ?? ""
      ).trim();

      const qtyValue = row["QTY"];
      const mrpValue = row["MRP"];

      const quantity = Number(qtyValue);
      const mrp = Number(mrpValue || 0);

      const location = String(
        row["LOCTION"] ?? ""
      ).trim() || "UNASSIGNED";

      const rowErrors = [];

      if (!description) {
        rowErrors.push("Missing description");
      }

      if (
        qtyValue === null ||
        qtyValue === "" ||
        !Number.isInteger(quantity) ||
        quantity < 0
      ) {
        rowErrors.push("Invalid or missing quantity");
      }

      if (!Number.isFinite(mrp) || mrp < 0) {
        rowErrors.push("Invalid MRP");
      }

      if (rowErrors.length > 0) {
        errors.push({
          excelRow: index + 2,
          partNo,
          errors: rowErrors
        });
      }

      preview.push({
        excelRow: index + 2,
        partNo,
        description,
        quantity: Number.isInteger(quantity) ? quantity : null,
        mrp,
        location,
        status: rowErrors.length ? "INVALID" : "VALID"
      });
    });

    const validRows = preview.filter(
      item => item.status === "VALID"
    );

    return res.json({
      success: true,
      message: "Excel preview generated successfully",

      summary: {
        totalRows: preview.length,
        validRows: validRows.length,
        invalidRows: errors.length,
        unassignedLocations: preview.filter(
          item => item.location === "UNASSIGNED"
        ).length
      },

      preview,
      errors
    });

  } catch (error) {
    console.error("Preview Error:", error);

    res.status(500).json({
      message: "Excel preview failed",
      error: error.message
    });
  }
});

router.post("/excel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel file"
      });
    }

    // Prevent accidental re-import and stock reset
    const existingStock = await Inventory.countDocuments();

    if (existingStock > 0) {
      return res.status(409).json({
        message:
          "Opening inventory already exists. Import cancelled to protect current stock."
      });
    }

    // Read Excel
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer"
    });

    const sheetName = workbook.SheetNames[0];

    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { defval: null }
    );

    const importedRows = [];
    const rejectedRows = [];
    const unassignedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const partNo = cleanPartNo(
        row["PART NO"] ?? row["PART NO "]
      );

      // Ignore summary/blank rows
      if (!partNo) continue;

      const description = String(
        row["Part description"] || ""
      ).trim();

      const qtyValue = row["QTY"];
      const mrpValue = row["MRP"];

      const qty = Number(qtyValue);
      const mrp = mrpValue === null ||
        mrpValue === undefined ||
        mrpValue === ""
        ? 0
        : Number(mrpValue);

      const location = String(
        row["LOCTION"] || ""
      ).trim() || "UNASSIGNED";

      const excelRow = i + 2;

      if (!description) {
        rejectedRows.push({
          row: excelRow,
          partNo,
          reason: "Missing description"
        });
        continue;
      }

      if (
        qtyValue === null ||
        qtyValue === undefined ||
        qtyValue === "" ||
        !Number.isInteger(qty) ||
        qty < 0
      ) {
        rejectedRows.push({
          row: excelRow,
          partNo,
          reason: "Missing or invalid quantity"
        });
        continue;
      }

      if (!Number.isFinite(mrp) || mrp < 0) {
        rejectedRows.push({
          row: excelRow,
          partNo,
          reason: "Invalid MRP"
        });
        continue;
      }

      if (location === "UNASSIGNED") {
        unassignedRows.push({
          row: excelRow,
          partNo
        });
      }

      importedRows.push({
        partNo,
        description,
        mrp,
        barcode: partNo,
        quantity: qty,
        location
      });
    }

    // Check duplicate part numbers
    const seen = new Set();
    const duplicateRows = [];

    for (const item of importedRows) {
      if (seen.has(item.partNo)) {
        duplicateRows.push(item.partNo);
      }
      seen.add(item.partNo);
    }

    if (duplicateRows.length > 0) {
      return res.status(400).json({
        message: "Duplicate Part Numbers found",
        duplicates: [...new Set(duplicateRows)]
      });
    }

    if (importedRows.length === 0) {
      return res.status(400).json({
        message: "No valid inventory records found",
        rejectedRows
      });
    }

    // Save Parts Master
    await Part.insertMany(
      importedRows.map(item => ({
        partNo: item.partNo,
        description: item.description,
        mrp: item.mrp,
        barcode: item.barcode
      }))
    );

    const savedParts = await Part.find({
      partNo: {
        $in: importedRows.map(item => item.partNo)
      }
    });

    const partMap = new Map(
      savedParts.map(part => [
        part.partNo,
        part._id
      ])
    );

    // Save location-wise stock
    const inventoryDocs = importedRows.map(item => ({
      part: partMap.get(item.partNo),
      location: item.location,
      quantity: item.quantity
    }));

    await Inventory.insertMany(inventoryDocs);

    // Save opening stock transaction history
    const transactionDocs = importedRows.map(item => ({
      part: partMap.get(item.partNo),
      location: item.location,
      type: "OPENING",
      quantity: item.quantity,
      balanceAfter: item.quantity
    }));

    await Transaction.insertMany(transactionDocs);

    return res.status(200).json({
      message: "Excel imported successfully",

      summary: {
        totalImported: importedRows.length,
        totalRejected: rejectedRows.length,
        totalUnassigned: unassignedRows.length,
        totalQuantity: importedRows.reduce(
          (sum, item) => sum + item.quantity,
          0
        )
      },

      rejectedRows,
      unassignedRows
    });

  } catch (error) {
    console.error("Excel Import Error:", error);

    return res.status(500).json({
      message: "Excel import failed",
      error: error.message
    });
  }
});

module.exports = router;
