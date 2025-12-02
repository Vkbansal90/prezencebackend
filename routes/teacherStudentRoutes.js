import express from "express";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import SubGroup from "../models/SubGroup.js";
import Enrollment from "../models/Enrollment.js";
import AttendanceLog from "../models/AttendanceLog.js";
import { protectTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get all students under logged-in teacher
 * GET /api/teacher/students
 * Optional query params: ?courseId=...&subGroupId=...&search=...
 */
router.get("/", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;
    const { courseId, subGroupId, search } = req.query;

    // Get all teacher's courses
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map((c) => c._id);

    // Build base filters
    const enrollmentFilter = { course: { $in: courseIds } };
    if (courseId) enrollmentFilter.course = courseId;

    // Get enrollments
    const enrollments = await Enrollment.find(enrollmentFilter)
      .populate("student") // Populate full student document
      .populate("course", "name");

    // If subgroup filter applied
    let filteredEnrollments = enrollments;
    if (subGroupId) {
      const subgroup = await SubGroup.findById(subGroupId).select("students");
      if (subgroup) {
        filteredEnrollments = enrollments.filter((enr) =>
          subgroup.students.some(
            (s) => s.toString() === enr.student._id.toString()
          )
        );
      }
    }

    // If search applied (by name)
    if (search) {
      const term = search.toLowerCase();
      filteredEnrollments = filteredEnrollments.filter((enr) =>
        enr.student.name.toLowerCase().includes(term)
      );
    }

    // Prepare response
    const studentList = await Promise.all(
      filteredEnrollments.map(async (enr) => {
        const subgroup = await SubGroup.findOne({
          course: enr.course._id,
          students: enr.student._id,
        }).select("name");

        return {
          user: {
            _id: enr.student._id,
            name: enr.student.name,
            email: enr.student.email,
            phone: enr.student.phone,
            rollNumber: enr.student.rollNumber
          },
          _id: enr.student._id,
          name: enr.student.name, // Fallback for flat parsing
          rollNumber: enr.student.rollNumber,
          course: enr.course.name,
          subGroup: subgroup ? subgroup.name : "—",
          attendanceRate: enr.attendanceRate ? `${enr.attendanceRate}%` : "0%",
          attendance: { rate: enr.attendanceRate || 0 }
        };
      })
    );

    res.json({
      total: studentList.length,
      students: studentList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Get attendance trend for a specific student (optional)
 * GET /api/teacher/students/:studentId/attendance
 */
router.get("/:studentId/attendance", protectTeacher, async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.teacher._id;

    // Get all courses under teacher
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map((c) => c._id);

    // Filter attendance logs for those courses
    const logs = await AttendanceLog.find({
      student: studentId,
      course: { $in: courseIds },
    })
      .populate("course", "name")
      .populate("session", "date");

    const summary = logs.map((log) => ({
      course: log.course.name,
      date: log.session?.date || null,
      status: log.status,
    }));

    res.json({ studentId, logs: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
