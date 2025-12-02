// routes/studentRoutes.js
import express from "express";
import { protectStudent } from "../middleware/authMiddleware.js";
import Enrollment from "../models/Enrollment.js";
import Student from "../models/Student.js";
const router = express.Router();

// Dashboard route (uses JWT)
router.get("/dashboard", protectStudent, async (req, res) => {
  try {
    const studentId = req.student._id; // Comes from JWT middleware

    // Fetch basic info
    const student = await Student.findById(studentId).select("name email");

    // Fetch all course enrollments
    const enrollments = await Enrollment.find({ student: studentId })
      .populate("course")
      .lean();

    // Calculate summary
    const totalCourses = enrollments.length;
    const avgAttendance =
      totalCourses === 0
        ? 0
        : Math.round(
            enrollments.reduce(
              (sum, e) => sum + (e.attendedClasses / Math.max(e.totalClasses, 1)),
              0
            ) /
              totalCourses *
              100
          );

    // FETCH TODAY SESSIONS
    const SubGroup = (await import("../models/SubGroup.js")).default;
    const ClassSession = (await import("../models/ClassSession.js")).default;

    // Find all subgroups the student belongs to
    const subGroups = await SubGroup.find({ students: studentId })
      .select("_id")
      .lean();
    const subGroupIds = subGroups.map((sg) => sg._id);

    // Define today's range (local day)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // For today's sessions, exclude already completed sessions and only
    // include sessions that are upcoming or currently ongoing.
    const todaySessions = await ClassSession.find({
      date: { $gte: start, $lte: end },
      status: { $in: ["upcoming", "ongoing"] },
      $or: [
        { enrolledStudents: studentId },
        { subGroup: { $in: subGroupIds } },
      ],
    })
      .populate("course", "name shortTitle building room teacher")
      .populate("subGroup", "name")
      .lean();

    // FETCH WEEKLY SCHEDULE (next 7 days)
    // For weekly sessions we want upcoming sessions from now forward
    // so we start from the current time (to avoid already passed sessions today).
    const weekStart = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklySessions = await ClassSession.find({
      date: { $gte: weekStart, $lte: weekEnd },
      status: { $in: ["upcoming", "ongoing"] },
      $or: [
        { enrolledStudents: studentId },
        { subGroup: { $in: subGroupIds } },
      ],
    })
      .populate("course", "name shortTitle building room teacher")
      .populate("subGroup", "name")
      .sort({ date: 1 })
      .lean();

    const dashboardData = {
      student: {
        name: student?.name,
        email: student?.email,
      },
      summary: {
        totalCourses,
        avgAttendance,
      },
      todaySessions,
      weeklySessions,
      courses: enrollments.map((e) => ({
        id: e.course?._id,
        name: e.course?.name,
        professor: e.course?.teacher,
        attendance: `${e.attendedClasses}/${e.totalClasses}`,
        percentage: Math.round((e.attendedClasses / Math.max(e.totalClasses, 1)) * 100),
        nextClass: e.nextClass || { day: "Today", time: "10:00 AM" },
        building: e.course?.building,
        room: e.course?.room,
      })),
    };

    res.json(dashboardData);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
