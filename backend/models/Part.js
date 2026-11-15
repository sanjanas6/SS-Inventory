
const mongoose = require("mongoose");

const partSchema = new mongoose.Schema(
    {
        partNo: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        mrp: {
            type: Number,
            default: 0
        },
        barcode: {
            type: String,
            required: true,
            unique: true
        },
        printedCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Part", partSchema);
