
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

const createAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing.");
        }

        if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
            throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required.");
        }

        if (process.env.ADMIN_PASSWORD.length < 8) {
            throw new Error("Admin password must be at least 8 characters.");
        }

        await mongoose.connect(process.env.MONGO_URI);

        const existingAdmin = await User.findOne({
            role: "ADMIN"
        });

        if (existingAdmin) {
            console.log("Admin account already exists. No changes made.");
            return;
        }

        await User.create({
            username: process.env.ADMIN_USERNAME,
            password: process.env.ADMIN_PASSWORD,
            role: "ADMIN"
        });

        console.log("Admin account created successfully.");

    } catch (error) {
        console.error("Admin Setup Error:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
