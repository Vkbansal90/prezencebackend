import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Teacher from "../models/Teacher.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import AttendanceLog from "../models/AttendanceLog.js";
import { protectTeacher } from "../middleware/authMiddleware.js"; // import middleware

const router = express.Router();

/**
 *  Register a new teacher
 * POST /api/teacher/register
 * Public
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department, designation, phone } = req.body;

    const existing = await Teacher.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Teacher already exists" });

    const teacher = new Teacher({
      name,
      email,
      password,
      department,
      designation,
      phone,
    });

    await teacher.save();

    res.status(201).json({ message: "Teacher registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Login
 * POST /api/teacher/login
 * Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });
    if (!teacher)
      return res.status(404).json({ error: "Teacher not found" });

    const match = await teacher.matchPassword(password);
    console.log(match);
    if (!match)
      return res.status(401).json({ error: "Invalidcredentials" });

    // Generate JWT token
    const token = jwt.sign({ id: teacher._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token, teacher });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Dashboard Overview
 * GET /api/teacher/dashboard
 * Protected (Teacher)
 */
router.get("/dashboard", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id; // from verified token

    // Fetch all courses taught by teacher
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map((c) => c._id);

    // Total students
    const totalStudents = await Enrollment.countDocuments({
      course: { $in: courseIds },
    });

    // Avg attendance across all enrolled students
    const enrollments = await Enrollment.find({ course: { $in: courseIds } });
    const avgAttendance =
      enrollments.length > 0
        ? (
            enrollments.reduce(
              (sum, e) => sum + (e.attendanceRate || 0),
              0
            ) / enrollments.length
          ).toFixed(1)
        : 0;

    // Engagement rate (attendance logs from this week)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const logs = await AttendanceLog.countDocuments({
      course: { $in: courseIds },
      date: { $gte: weekStart },
      status: "completed",
    });

    const engagementRate =
      enrollments.length > 0
        ? ((logs / (enrollments.length * 7)) * 100).toFixed(1)
        : 0;

    res.json({
      totalStudents,
      activeCourses: courses.length,
      avgAttendance,
      engagementRate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Recent Activity
 * GET /api/teacher/activity
 * Protected (Teacher)
 */
router.get("/activity", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id; //from token

    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map((c) => c._id);

    const logs = await AttendanceLog.find({ course: { $in: courseIds } })
      .populate("student", "name")
      .populate("course", "name")
      .sort({ date: -1 })
      .limit(10);

    const activity = logs.map((log) => ({
      student: log.student.name,
      course: log.course.name,
      status:
        log.status === "completed" ? "Marked present" : "Marked absent",
      time: new Date(log.date).toLocaleString(),
    }));

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Course Performance
 * GET /api/teacher/performance
 * Protected (Teacher)
 */
router.get("/performance", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;

    const courses = await Course.find({ teacher: teacherId });

    const performance = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await Enrollment.find({ course: course._id });
        const avgRate =
          enrollments.length > 0
            ? (
                enrollments.reduce(
                  (sum, e) => sum + (e.attendanceRate || 0),
                  0
                ) / enrollments.length
              ).toFixed(1)
            : 0;

        return {
          course: course.name,
          totalStudents: enrollments.length,
          attendanceRate: avgRate,
        };
      })
    );

    res.json(performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all courses for logged-in teacher
 * GET /api/teacher/courses
 * Protected (Teacher)
 */
router.get("/courses", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;
    const courses = await Course.find({ teacher: teacherId })
      .populate("subGroups", "name");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
