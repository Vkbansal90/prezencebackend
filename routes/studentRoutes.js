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
              (sum, e) => sum + e.attendedClasses / e.totalClasses,
              0
            ) /
              totalCourses *
              100
          );

    // Build formatted response
    const dashboardData = {
      student: {
        name: student.name,
        email: student.email,
      },
      summary: {
        totalCourses,
        avgAttendance,
      },
      courses: enrollments.map((e) => ({
        id: e.course._id,
        name: e.course.name,
        professor: e.course.professor,
        attendance: `${e.attendedClasses}/${e.totalClasses}`,
        percentage: Math.round((e.attendedClasses / e.totalClasses) * 100),
        nextClass: e.nextClass || { day: "Today", time: "10:00 AM" },
        building: e.course.building,
        room: e.course.room,
      })),
    };

    res.json(dashboardData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
