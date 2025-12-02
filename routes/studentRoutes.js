import express from "express";
import { protectStudent } from "../middleware/authMiddleware.js";
import Enrollment from "../models/Enrollment.js";
import Student from "../models/Student.js";
import ClassSession from "../models/ClassSession.js";
import SubGroup from "../models/SubGroup.js";
import AttendanceLog from "../models/AttendanceLog.js";

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

    const courseIds = enrollments.map(e => e.course?._id).filter(id => !!id);

    // Calculate summary and enrich courses
    const coursesData = await Promise.all(enrollments.map(async (e) => {
      if (!e.course) return null;

      // Calculate stats dynamically to ensure consistency
      const completedSessions = await ClassSession.find({
        course: e.course._id,
        status: { $in: ["completed", "ongoing"] }
      }).select("_id");
      
      const completedSessionIds = completedSessions.map(s => s._id);
      const totalClasses = completedSessionIds.length;

      const attendedClasses = await AttendanceLog.countDocuments({
        student: studentId,
        course: e.course._id,
        session: { $in: completedSessionIds },
        status: "completed"
      });

      return {
        id: e.course._id,
        name: e.course.name,
        professor: e.course.teacher,
        attendance: `${attendedClasses}/${totalClasses}`,
        percentage: totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0,
        nextClass: e.nextClass || { day: "Today", time: "10:00 AM" },
        building: e.course.building,
        room: e.course.room,
        // Helper for summary
        _stats: { attended: attendedClasses, total: totalClasses }
      };
    }));

    const validCourses = coursesData.filter(c => c !== null);

    const totalCourses = validCourses.length;
    const avgAttendance =
      totalCourses === 0
        ? 0
        : Math.round(
            validCourses.reduce(
              (sum, c) => sum + (c.percentage),
              0
            ) / totalCourses
          );

    // FETCH TODAY SESSIONS
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
      course: { $in: courseIds },
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
      course: { $in: courseIds },
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
      courses: validCourses.map(c => {
        const { _stats, ...rest } = c;
        return rest;
      }),
    };

    res.json(dashboardData);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
