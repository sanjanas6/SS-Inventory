
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        part: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Part",
            required: true
        },

        location: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: ["OPENING", "INWARD", "OUTWARD"],
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        balanceAfter: {
            type: Number,
            required: true,
            min: 0
        },

        // Customer name for outward transactions
        customerName: {
            type: String,
            trim: true,
            required: function () {
                return this.type === "OUTWARD";
            }
        },

        vrn: {
            type: String,
            trim: true,
            required: function () {
                return this.type === "OUTWARD";
            }
        },

        manualNo: {
            type: String,
            trim: true,
            required: function () {
                return this.type === "OUTWARD";
            }
        },

        issueDate: {
            type: Date,
            required: function () {
                return this.type === "OUTWARD";
            }
        },

        issuedBy: {
            type: String,
            trim: true,
            required: function () {
                return this.type === "OUTWARD";
            }
        },

        // Groups multiple tools issued in one submission
        issueBatchId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "Transaction",
    transactionSchema
);
