
const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Part",
      required: true
    },
    location: {
      type: String,
      required: true,
      default: "UNASSIGNED"
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  { timestamps: true }
);

inventorySchema.index(
  { part: 1, location: 1 },
  { unique: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
