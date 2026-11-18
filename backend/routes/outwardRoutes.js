
const express = require("express");
const mongoose = require("mongoose");

const Part = require("../models/Part");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");
const InvoiceCounter = require("../models/InvoiceCounter");

const router = express.Router();

// GET /api/outward/barcode/:barcode
// Find tool by scanned barcode

router.get("/barcode/:barcode", async (req, res) => {
    try {
        const barcode = String(req.params.barcode || "").trim();

        const part = await Part.findOne({ barcode }).lean();

        if (!part) {
            return res.status(404).json({
                success: false,
                message: "No tool found for this barcode."
            });
        }

        const inventories = await Inventory.find({
            part: part._id
        }).lean();

        const availableStock = inventories.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        return res.json({
            success: true,
            part: {
                _id: part._id,
                partNo: part.partNo,
                description: part.description,
                barcode: part.barcode,
                mrp: part.mrp,
                availableStock
            }
        });

    } catch (error) {
        console.error("Barcode Lookup Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to find tool."
        });
    }
});


// POST /api/outward
// Issue multiple tools to one customer

router.post("/", async (req, res) => {
    const {
        customerName,
        vrn,
        manualNo,
        issueDate,
        issuedBy,
        items
    } = req.body;

    const cleanCustomerName = String(customerName || "").trim();
    const cleanVRN = String(vrn || "").trim();
    const cleanManualNo = String(manualNo || "").trim();
    const cleanIssuedBy = String(issuedBy || "").trim();
    const parsedIssueDate = new Date(issueDate);

    if (!cleanCustomerName) {
        return res.status(400).json({
            success: false,
            message: "Customer name is required."
        });
    }

    if (!cleanVRN || !cleanManualNo || !cleanIssuedBy || !issueDate) {
        return res.status(400).json({
            success: false,
            message: "VRN, Manual No., Date and Issued By are required."
        });
    }

    if (isNaN(parsedIssueDate.getTime())) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid issue date."
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Please scan at least one tool."
        });
    }

    // Validate and combine duplicate part IDs
    const itemMap = new Map();

    for (const item of items) {
        const partId = item?.partId;
        const quantity = Number(item?.quantity);
        const mrp = Number(item?.mrp);

        if (!mongoose.Types.ObjectId.isValid(partId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid part ID."
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Issue quantity must be a positive whole number."
            });
        }

        if (!Number.isFinite(mrp) || mrp < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid MRP is required."
            });
        }

        const id = String(partId);

        if (itemMap.has(id)) {
            const existingItem = itemMap.get(id);

            if (existingItem.mrp !== mrp) {
                return res.status(400).json({
                    success: false,
                    message: "MRP must be the same for duplicate parts in one issue."
                });
            }

            existingItem.quantity += quantity;
        } else {
            itemMap.set(id, {
                quantity,
                mrp
            });
        }
    }

    const batchId = new mongoose.Types.ObjectId();


    // Keep track of stock deductions for compensation
    const stockDeductions = [];

    try {
        const preparedItems = [];

        // STEP 1: Validate stock for ALL parts before deduction
        for (const [partId, itemData] of itemMap) {

            const issueQuantity = itemData.quantity;
            const mrp = itemData.mrp;

            const part = await Part.findById(partId);

            if (!part) {
                const error = new Error("Part not found.");
                error.statusCode = 404;
                throw error;
            }

            const inventories = await Inventory.find({
                part: partId
            }).sort({ _id: 1 });

            const totalAvailable = inventories.reduce(
                (sum, inventory) => sum + inventory.quantity,
                0
            );

            if (totalAvailable < issueQuantity) {
                const error = new Error(
                    `Insufficient stock for ${part.partNo}. Available: ${totalAvailable}, Requested: ${issueQuantity}`
                );

                error.statusCode = 400;
                throw error;
            }

            preparedItems.push({
                part,
                issueQuantity,
                mrp,
                inventories
            });
        }

        // Generate invoice number after stock validation
        const counter = await InvoiceCounter.findOneAndUpdate(
            { name: "outwardInvoice" },
            { $inc: { sequence: 1 } },
            {
                new: true,
                upsert: true
            }
        );

        const invoiceNo = `SSM-${String(counter.sequence).padStart(6, "0")}`;

        // STEP 2: Deduct stock
        const transactionRecords = [];
        const issuedItems = [];

        for (const prepared of preparedItems) {

            const { part, issueQuantity, mrp, inventories } = prepared;

            let remainingToIssue = issueQuantity;

            for (const inventory of inventories) {

                if (remainingToIssue <= 0) break;

                const deductQuantity = Math.min(
                    inventory.quantity,
                    remainingToIssue
                );

                const updatedInventory =
                    await Inventory.findOneAndUpdate(
                        {
                            _id: inventory._id,
                            quantity: { $gte: deductQuantity }
                        },
                        {
                            $inc: {
                                quantity: -deductQuantity
                            }
                        },
                        {
                            new: true
                        }
                    );

                if (!updatedInventory) {
                    throw new Error(
                        `Stock changed while issuing ${part.partNo}. Please refresh and try again.`
                    );
                }

                // Save deduction for compensation if something fails
                stockDeductions.push({
                    inventoryId: inventory._id,
                    quantity: deductQuantity
                });



                transactionRecords.push({
                    part: part._id,
                    location: inventory.location,
                    type: "OUTWARD",
                    quantity: deductQuantity,
                    balanceAfter: updatedInventory.quantity,

                    customerName: cleanCustomerName,
                    vrn: cleanVRN,
                    manualNo: cleanManualNo,
                    issueDate: parsedIssueDate,
                    issuedBy: cleanIssuedBy,

                    mrp: mrp,
                    invoiceNo: invoiceNo,

                    issueBatchId: batchId
                });

                issuedItems.push({
                    partNo: part.partNo,
                    description: part.description,
                    barcode: part.barcode,
                    location: inventory.location,
                    issuedQuantity: deductQuantity,
                    balanceAfter: updatedInventory.quantity,
                    mrp: mrp
                });

                remainingToIssue -= deductQuantity;
            }

            if (remainingToIssue > 0) {
                throw new Error(
                    `Unable to deduct complete quantity for ${part.partNo}.`
                );
            }
        }

        // STEP 3: Save all transaction records
        await Transaction.insertMany(transactionRecords);

        return res.status(200).json({
            success: true,
            message: "Tools issued successfully!",
            issueBatchId: batchId,
            invoiceNo: invoiceNo,
            customerName: cleanCustomerName,
            vrn: cleanVRN,
            manualNo: cleanManualNo,
            issueDate: parsedIssueDate,
            issuedBy: cleanIssuedBy,
            totalTools: Array.from(itemMap.values()).reduce(
    (sum, item) => sum + item.quantity,
    0
),
            items: issuedItems
        });

    } catch (error) {

        console.error("Outward API Error:", error);

        // COMPENSATION:
        // Restore deductions if the issue operation fails
        try {
            for (const deduction of stockDeductions) {
                await Inventory.updateOne(
                    { _id: deduction.inventoryId },
                    {
                        $inc: {
                            quantity: deduction.quantity
                        }
                    }
                );
            }

            // Remove any transactions created for this batch
            await Transaction.deleteMany({
                issueBatchId: batchId
            });

        } catch (rollbackError) {
            console.error(
                "Outward Compensation Error:",
                rollbackError
            );
        }

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Unable to issue tools."
        });
    }
});

module.exports = router;
