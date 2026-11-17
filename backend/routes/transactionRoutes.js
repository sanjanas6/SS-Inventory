
const express = require("express");

const Transaction = require("../models/Transaction");

const router = express.Router();

// GET /api/transactions
// Fetch transaction history

router.get("/", async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

        const { type, search } = req.query;

        const filter = { type: "OUTWARD" };

        // Fetch transactions with part details
        let transactions = await Transaction.find(filter)
            .populate("part", "partNo description barcode")
            .sort({ createdAt: -1 })
            .lean();

        // Search by part number, description, customer or location
        if (search && search.trim()) {
            const searchText = search.trim().toLowerCase();

            transactions = transactions.filter(transaction => {
                const partNo = transaction.part?.partNo || "";
                const description = transaction.part?.description || "";
                const customerName = transaction.customerName || "";
                const location = transaction.location || "";
const vrn = transaction.vrn || "";
const manualNo = transaction.manualNo || "";
const issuedBy = transaction.issuedBy || "";

                return (
                    partNo.toLowerCase().includes(searchText) ||
                    description.toLowerCase().includes(searchText) ||
                    customerName.toLowerCase().includes(searchText) ||
                    location.toLowerCase().includes(searchText) ||
                    vrn.toLowerCase().includes(searchText) ||
                    manualNo.toLowerCase().includes(searchText) ||
                    issuedBy.toLowerCase().includes(searchText)
                );
            });
        }

        const total = transactions.length;
        const totalPages = Math.ceil(total / limit);

        const startIndex = (page - 1) * limit;

        const paginatedTransactions = transactions.slice(
            startIndex,
            startIndex + limit
        );

        return res.json({
            success: true,
            transactions: paginatedTransactions,
            total,
            page,
            limit,
            totalPages
        });

    } catch (error) {
        console.error("Transaction Fetch Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch transactions."
        });
    }
});


// GET /api/transactions/export
// Export ALL matching outward transactions (not just current page)

router.get("/export", async (req, res) => {
    try {
        const { search } = req.query;

        const filter = { type: "OUTWARD" };

        let transactions = await Transaction.find(filter)
            .populate("part", "partNo description barcode")
            .sort({ createdAt: -1 })
            .lean();

        // Apply same search filter as transaction history
        if (search && search.trim()) {
            const searchText = search.trim().toLowerCase();

            transactions = transactions.filter(transaction => {
                const partNo = transaction.part?.partNo || "";
                const description = transaction.part?.description || "";
                const customerName = transaction.customerName || "";
                const location = transaction.location || "";
                const vrn = transaction.vrn || "";
                const manualNo = transaction.manualNo || "";
                const issuedBy = transaction.issuedBy || "";

                return (
                    partNo.toLowerCase().includes(searchText) ||
                    description.toLowerCase().includes(searchText) ||
                    customerName.toLowerCase().includes(searchText) ||
                    location.toLowerCase().includes(searchText) ||
                    vrn.toLowerCase().includes(searchText) ||
                    manualNo.toLowerCase().includes(searchText) ||
                    issuedBy.toLowerCase().includes(searchText)
                );
            });
        }

        return res.json({
            success: true,
            total: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("Transaction Export Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to export transactions."
        });
    }
});

module.exports = router;
