
const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Authentication configuration error."
            });
        }

        const user = await User.findOne({
            username: String(username).trim().toLowerCase()
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to login."
        });
    }
});


// POST /api/auth/create-store-manager
// Only Admin can create Store Manager accounts

router.post(
    "/create-store-manager",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const { username, password } = req.body;

            const cleanUsername = String(username || "").trim().toLowerCase();

            if (!cleanUsername || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required."
                });
            }

            if (cleanUsername.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: "Username must contain at least 3 characters."
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: "Password must contain at least 8 characters."
                });
            }

            const existingUser = await User.findOne({
                username: cleanUsername
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Username already exists."
                });
            }

            const storeManager = await User.create({
                username: cleanUsername,
                password,
                role: "STORE_MANAGER"
            });

            return res.status(201).json({
                success: true,
                message: "Store Manager created successfully.",
                user: {
                    id: storeManager._id,
                    username: storeManager.username,
                    role: storeManager.role
                }
            });

        } catch (error) {
            console.error("Create Store Manager Error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to create Store Manager."
            });
        }
    }
);

module.exports = router;
