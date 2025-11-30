import express from "express";
import ClassSession from "../models/ClassSession.js";
import Course from "../models/Course.js";
import SubGroup from "../models/SubGroup.js";
import Student from "../models/Student.js";
import { protectTeacher } from "../middleware/authMiddleware.js"; // Secure middleware

const router = express.Router();

/**
 *  Schedule a new class
 * POST /api/teacher/schedule
 * Protected (Teacher)
 */
router.post("/", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id; // from JWT
    const {
      courseId,
      subGroupId,
      date,
      startTime,
      endTime,
      location,
      note,
      type,
    } = req.body;

    // Validate course and subgroup
    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ error: "Course not found" });

    let totalStudents = 0;
    let enrolledStudents = [];

    if (subGroupId) {
      const subGroup = await SubGroup.findById(subGroupId).populate("students");
      if (!subGroup)
        return res.status(404).json({ error: "Subgroup not found" });

      totalStudents = subGroup.students.length;
      enrolledStudents = subGroup.students.map((s) => s._id);
    } else {
      // All students enrolled in this teacher’s course
      const students = await Student.find({ courses: { $exists: true } });
      enrolledStudents = students.map((s) => s._id);
      totalStudents = enrolledStudents.length;
    }

    const session = new ClassSession({
      course: courseId,
      subGroup: subGroupId,
      teacher: teacherId,
      date,
      startTime,
      endTime,
      location,
      note,
      type,
      totalStudents,
      enrolledStudents,
      status: "upcoming",
    });

    await session.save();

    res.status(201).json({
      message: "Class scheduled successfully",
      session,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all upcoming classes for logged-in teacher
 * GET /api/teacher/schedule/upcoming
 * Protected (Teacher)
 */
router.get("/upcoming", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;

    const sessions = await ClassSession.find({
      teacher: teacherId,
      status: "upcoming",
    })
      .populate("course", "name")
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
 *  Edit a scheduled class
 * PUT /api/teacher/schedule/:sessionId
 * Protected (Teacher)
 */
router.put("/:sessionId", protectTeacher, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.teacher._id;

    const session = await ClassSession.findOneAndUpdate(
      { _id: sessionId, teacher: teacherId }, // teacher owns it
      req.body,
      { new: true }
    );

    if (!session)
      return res.status(404).json({ error: "Session not found or unauthorized" });

    res.json({ message: "Class updated successfully", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Cancel a class
 * PUT /api/teacher/schedule/:sessionId/cancel
 * Protected (Teacher)
 */
router.put("/:sessionId/cancel", protectTeacher, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.teacher._id;

    const session = await ClassSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session)
      return res.status(404).json({ error: "Session not found or unauthorized" });

    session.status = "cancelled";
    await session.save();

    res.json({ message: " Class cancelled successfully", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Start a class
 * PUT /api/teacher/schedule/:sessionId/start
 * Protected (Teacher)
 */
router.put("/:sessionId/start", protectTeacher, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.teacher._id;

    const session = await ClassSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session)
      return res.status(404).json({ error: "Session not found or unauthorized" });

    session.status = "ongoing";
    await session.save();

    res.json({ message: " Class started", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Mark class completed
 * PUT /api/teacher/schedule/:sessionId/complete
 * Protected (Teacher)
 */
router.put("/:sessionId/complete", protectTeacher, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.teacher._id;

    const session = await ClassSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session)
      return res.status(404).json({ error: "Session not found or unauthorized" });

    session.status = "completed";
    await session.save();

    // Auto-update SubGroup’s last session date if linked
    if (session.subGroup) {
      await SubGroup.findByIdAndUpdate(session.subGroup, {
        lastSessionDate: session.date,
      });
    }

    res.json({ message: " Class marked as completed", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
