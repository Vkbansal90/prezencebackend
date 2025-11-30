import express from "express";
import AttendanceLog from "../models/AttendanceLog.js";
import Enrollment from "../models/Enrollment.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * Overview — overall student stats
 */
router.get("/overview/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const total = await AttendanceLog.countDocuments({ student: studentId });
    const attended = await AttendanceLog.countDocuments({ student: studentId, status: "completed" });
    const failed = await AttendanceLog.countDocuments({ student: studentId, status: "failed" });
    const pending = await AttendanceLog.countDocuments({ student: studentId, status: "pending" });

    const attendanceRate = total > 0 ? ((attended / total) * 100).toFixed(1) : 0;

    res.json({
      attended,
      total,
      attendanceRate,
      absences: failed,
      pending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Course-wise performance
 */
router.get("/coursewise/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    // Using Enrollment for base info
    const enrollments = await Enrollment.find({ student: studentId }).populate("course");

    const data = await Promise.all(
      enrollments.map(async (en) => {
        const total = await AttendanceLog.countDocuments({ student: studentId, course: en.course._id });
        const attended = await AttendanceLog.countDocuments({ student: studentId, course: en.course._id, status: "completed" });
        const rate = total > 0 ? ((attended / total) * 100).toFixed(1) : 0;

        return {
          courseName: en.course.name,
          attended,
          total,
          rate,
        };
      })
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Status distribution (for pie chart)
 */
router.get("/status/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const statusCounts = await AttendanceLog.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { completed: 0, failed: 0, pending: 0 };
    statusCounts.forEach((s) => (result[s._id] = s.count));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Monthly trend
 */
router.get("/monthly/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const monthlyData = await AttendanceLog.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: { $month: "$date" },
          presentCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalCount: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id",
          rate: {
            $round: [{ $multiply: [{ $divide: ["$presentCount", "$totalCount"] }, 100] }, 1],
          },
          _id: 0,
        },
      },
      { $sort: { month: 1 } },
    ]);

    res.json(monthlyData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Weekly trend (last 4 weeks)
 */
router.get("/weekly/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const weeklyData = await AttendanceLog.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          date: { $gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) }, // last 4 weeks
        },
      },
      {
        $group: {
          _id: { $week: "$date" },
          presentCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalCount: { $sum: 1 },
        },
      },
      {
        $project: {
          week: "$_id",
          rate: {
            $round: [{ $multiply: [{ $divide: ["$presentCount", "$totalCount"] }, 100] }, 1],
          },
          _id: 0,
        },
      },
      { $sort: { week: 1 } },
    ]);

    res.json(weeklyData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
