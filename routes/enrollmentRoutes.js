import express from "express";
import Enrollment from "../models/Enrollment.js";
const router = express.Router();

// POST: mark attendance
router.post("/:id/mark", async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });

  enrollment.attendedClasses += 1;
  enrollment.totalClasses += 1;
  await enrollment.save();

  res.json({ message: "Attendance marked", enrollment });
});

// GET: fetch all enrollments
router.get("/", async (req, res) => {
  const data = await Enrollment.find().populate("student course");
  res.json(data);
});

export default router;
