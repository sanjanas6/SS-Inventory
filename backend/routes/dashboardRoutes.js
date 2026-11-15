
const express = require("express");
const Part = require("../models/Part");
const Inventory = require("../models/Inventory");

const router = express.Router();

const LOW_STOCK_LIMIT = 5;

// GET /api/dashboard/summary
router.get("/summary", async (req, res) => {
  try {
    const totalParts = await Part.countDocuments();

    // Calculate stock and stock value per part
    const stockSummary = await Inventory.aggregate([
      {
        $lookup: {
          from: "parts",
          localField: "part",
          foreignField: "_id",
          as: "partData"
        }
      },
      {
        $unwind: "$partData"
      },
      {
        $group: {
          _id: "$part",
          totalQuantity: {
            $sum: "$quantity"
          },
          totalValue: {
            $sum: {
              $multiply: [
                "$quantity",
                { $ifNull: ["$partData.mrp", 0] }
              ]
            }
          }
        }
      }
    ]);

    const totalStock = stockSummary.reduce(
      (sum, item) => sum + item.totalQuantity,
      0
    );

    const totalStockValue = stockSummary.reduce(
      (sum, item) => sum + item.totalValue,
      0
    );

    const lowStockItems = stockSummary.filter(
      item => item.totalQuantity <= LOW_STOCK_LIMIT
    ).length;

    // Latest inventory records
    const recentInventory = await Inventory.find()
      .populate("part", "partNo description mrp barcode")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    const recentParts = recentInventory
      .filter(item => item.part)
      .map(item => ({
        _id: item._id,
        partNo: item.part.partNo,
        description: item.part.description,
        location: item.location,
        quantity: item.quantity,
        mrp: item.part.mrp
      }));

    return res.json({
      success: true,
      stats: {
        totalParts,
        totalStock,
        totalStockValue,
        lowStockItems
      },
      recentParts
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard data."
    });
  }
});

module.exports = router;
