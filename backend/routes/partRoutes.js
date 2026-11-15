const bwipjs = require("bwip-js");
const express = require("express");

const Part = require("../models/Part");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");

const router = express.Router();

// GET all parts with inventory details
router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20)
    );

    const filter = search
      ? {
          $or: [
            { partNo: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const total = await Part.countDocuments(filter);

    const parts = await Part.find(filter)
      .sort({ partNo: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const partIds = parts.map(part => part._id);

    const stockData = await Inventory.find({
      part: { $in: partIds }
    }).lean();

    const inventoryMap = new Map();

    stockData.forEach(stock => {
      const key = String(stock.part);

      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, {
          totalQuantity: 0,
          locations: []
        });
      }

      const item = inventoryMap.get(key);

      item.totalQuantity += stock.quantity;

      item.locations.push({
        location: stock.location,
        quantity: stock.quantity
      });
    });

    const result = parts.map(part => {
      const stock = inventoryMap.get(String(part._id)) || {
        totalQuantity: 0,
        locations: []
      };

      return {
        ...part,
        availableStock: stock.totalQuantity,
        locations: stock.locations
      };
    });

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      parts: result
    });

  } catch (error) {
    console.error("Parts API Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch parts",
      error: error.message
    });
  }
});


router.post("/", async (req, res) => {
  let savedPart = null;
  let savedInventory = null;

  try {
    const {
      partNo,
      description,
      mrp,
      location,
      quantity
    } = req.body;

    const cleanPartNo = String(partNo || "").trim();
    const cleanDescription = String(description || "").trim();
    const cleanLocation = String(location || "").trim() || "UNASSIGNED";

    const parsedMrp = Number(mrp);
    const parsedQuantity = Number(quantity);

    if (!cleanPartNo || !cleanDescription) {
      return res.status(400).json({
        success: false,
        message: "Part Number and Description are required."
      });
    }

    if (!Number.isFinite(parsedMrp) || parsedMrp < 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid MRP."
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid non-negative opening quantity."
      });
    }

    const existingPart = await Part.findOne({
      partNo: cleanPartNo
    });

    if (existingPart) {
      return res.status(409).json({
        success: false,
        message: "This Part Number already exists."
      });
    }

    // Create Part Master
    savedPart = await Part.create({
      partNo: cleanPartNo,
      description: cleanDescription,
      mrp: parsedMrp,
      barcode: cleanPartNo
    });

    // Create Opening Inventory
    savedInventory = await Inventory.create({
      part: savedPart._id,
      location: cleanLocation,
      quantity: parsedQuantity
    });

    // Create Opening Transaction
    await Transaction.create({
      part: savedPart._id,
      location: cleanLocation,
      type: "OPENING",
      quantity: parsedQuantity,
      balanceAfter: parsedQuantity
    });

    return res.status(201).json({
      success: true,
      message: "New part added successfully!",
      part: {
        _id: savedPart._id,
        partNo: savedPart.partNo,
        description: savedPart.description,
        mrp: savedPart.mrp,
        barcode: savedPart.barcode,
        availableStock: savedInventory.quantity,
        location: savedInventory.location
      }
    });

  } catch (error) {
    // Roll back documents created by this request
    if (savedInventory) {
      await Inventory.deleteOne({ _id: savedInventory._id });
    }

    if (savedPart) {
      await Part.deleteOne({ _id: savedPart._id });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Part Number or Barcode already exists."
      });
    }

    console.error("Add Part Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add new part.",
      error: error.message
    });
  }
});


// Generate barcode image for a part
router.get("/:id/barcode", async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);

    if (!part) {
      return res.status(404).json({
        success: false,
        message: "Part not found."
      });
    }

    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: part.barcode,
      scale: 3,
      height: 15,
      includetext: true,
      textxalign: "center"
    });

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");

    return res.send(barcodeBuffer);

  } catch (error) {
    console.error("Barcode Generation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate barcode.",
      error: error.message
    });
  }
});


// Increment printed count after print dialog completes
router.post("/:id/printed", async (req, res) => {
  try {
    const part = await Part.findByIdAndUpdate(
      req.params.id,
      { $inc: { printedCount: 1 } },
      { new: true, runValidators: true }
    );

    if (!part) {
      return res.status(404).json({
        success: false,
        message: "Part not found."
      });
    }

    return res.json({
      success: true,
      message: "Printed count updated successfully!",
      printedCount: part.printedCount
    });

  } catch (error) {
    console.error("Printed Count Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update printed count."
    });
  }
});


// UPDATE PART MRP, LOCATION AND STOCK
// PATCH /api/parts/:id

router.patch("/:id", async (req, res) => {
    try {
        const { mrp, location, quantity } = req.body;
        const partId = req.params.id;

        const updatedMrp = Number(mrp);
        const updatedQuantity = Number(quantity);
        const updatedLocation = String(location || "").trim();

        if (!Number.isFinite(updatedMrp) || updatedMrp < 0) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid MRP."
            });
        }

        if (!Number.isInteger(updatedQuantity) || updatedQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock quantity must be a non-negative whole number."
            });
        }

        if (!updatedLocation) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid location."
            });
        }

        const part = await Part.findById(partId);

        if (!part) {
            return res.status(404).json({
                success: false,
                message: "Part not found."
            });
        }

        // Get all inventory records for this part
        const inventories = await Inventory.find({
            part: partId
        }).sort({ _id: 1 });

        let inventory;

        if (inventories.length > 0) {
            // Keep one inventory record
            inventory = inventories[0];

            inventory.location = updatedLocation;
            inventory.quantity = updatedQuantity;

            await inventory.save();

            // Remove extra inventory records for this part
            if (inventories.length > 1) {
                await Inventory.deleteMany({
                    part: partId,
                    _id: { $ne: inventory._id }
                });
            }
        } else {
            // Create inventory if none exists
            inventory = await Inventory.create({
                part: partId,
                location: updatedLocation,
                quantity: updatedQuantity
            });
        }

        // Update MRP
        part.mrp = updatedMrp;
        await part.save();

        return res.status(200).json({
            success: true,
            message: "Part details updated successfully.",
            part: {
                _id: part._id,
                partNo: part.partNo,
                mrp: part.mrp
            },
            inventory: {
                _id: inventory._id,
                location: inventory.location,
                quantity: inventory.quantity
            }
        });

    } catch (error) {
        console.error("Update Part Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update part details.",
            error: error.message
        });
    }
});



module.exports = router;
 