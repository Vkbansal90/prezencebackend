import express from "express";
import ClassSession from "../models/ClassSession.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import { protectStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get all upcoming sessions for logged-in student
 * GET /api/schedule/upcoming
 * Protected route (Student)
 */
router.get("/upcoming", protectStudent, async (req, res) => {
  try {
    const studentId = req.student._id; // from JWT

    // Find all upcoming sessions where the student is in the enrolledStudents list
    const sessions = await ClassSession.find({
      enrolledStudents: studentId,
      status: { $in: ["upcoming", "scheduled"] },
      date: { $gte: new Date() },
    })
      .populate("course", "name")
      .populate("teacher", "name")
      .populate("subGroup", "name")
      .sort({ date: 1, startTime: 1 });

    res.json({
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get student’s next class (closest upcoming)
 * GET /api/schedule/next
 * Protected route (Student)
 */
router.get("/next", protectStudent, async (req, res) => {
  try {
    const studentId = req.student._id;

    const nextClass = await ClassSession.findOne({
      enrolledStudents: studentId,
      status: { $in: ["upcoming", "scheduled"] },
      date: { $gte: new Date() },
    })
      .populate("course", "name")
      .populate("teacher", "name")
      .populate("subGroup", "name")
      .sort({ date: 1, startTime: 1 });

    if (!nextClass)
      return res.status(404).json({ message: "No upcoming classes found." });

    res.json(nextClass);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get weekly schedule for student
 * GET /api/schedule/week
 * Protected route (Student)
 */
router.get("/week", protectStudent, async (req, res) => {
  try {
    const studentId = req.student._id;

    // Define date range for this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const weeklySessions = await ClassSession.find({
      enrolledStudents: studentId,
      date: { $gte: startOfWeek, $lte: endOfWeek },
    })
      .populate("course", "name")
      .populate("teacher", "name")
      .populate("subGroup", "name")
      .sort({ date: 1, startTime: 1 });

    res.json({
      weekStart: startOfWeek,
      weekEnd: endOfWeek,
      sessions: weeklySessions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
