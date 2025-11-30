import express from "express";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Secret key (in .env ideally)
const JWT_SECRET = process.env.JWT_SECRET;

// Helper: Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
};

// REGISTER (Sign Up)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, rollNumber } = req.body;

    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const student = await Student.create({ name, email, password, rollNumber });
    const token = generateToken(student._id);

    res.status(201).json({
      message: "Registration successful",
      token,
      student: { id: student._id, name: student.name, email: student.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    console.log(email);
    if (!student) return res.status(400).json({ error: "Invalid email" });

    const match = await student.matchPassword(password);
    console.log(match);
    if (!match) return res.status(400).json({ error: "password" });

    const token = generateToken(student._id);

    res.json({
      message: "Login successful",
      token,
      student: { id: student._id, name: student.name, email: student.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROFILE (Protected)
router.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const student = await Student.findById(decoded.id).select("-password");
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json({ student });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
