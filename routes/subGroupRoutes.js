import express from "express";
import SubGroup from "../models/SubGroup.js";
import AttendanceLog from "../models/AttendanceLog.js";
import ClassSession from "../models/ClassSession.js";
import Course from "../models/Course.js";
import { protectTeacher } from "../middleware/authMiddleware.js"; // Added

const router = express.Router();

/**
 *  Get all subgroups for logged-in teacher
 * GET /api/teacher/subgroups
 * Protected (Teacher)
 */
router.get("/", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id; //  from JWT token

    const subgroups = await SubGroup.find({ teacher: teacherId })
      .populate("course", "name")
      .sort({ name: 1 });

    // Compute attendance dynamically for each group
    const data = await Promise.all(
      subgroups.map(async (group) => {
        const total = group.totalStudents || group.students.length;

        const presentCount = await AttendanceLog.countDocuments({
          course: group.course._id,
          student: { $in: group.students },
          status: "completed",
        });

        const absentCount = await AttendanceLog.countDocuments({
          course: group.course._id,
          student: { $in: group.students },
          status: "failed",
        });

        const attendanceRate =
          total > 0
            ? ((presentCount / (presentCount + absentCount)) * 100).toFixed(1)
            : 0;

        // Latest class session date
        const lastSession = await ClassSession.findOne({
          course: group.course._id,
          subGroup: group._id,
        })
          .sort({ date: -1 })
          .select("date");

        return {
          groupName: group.name,
          courseName: group.course.name,
          totalStudents: total,
          present: presentCount,
          absent: absentCount,
          attendanceRate,
          lastClassDate: lastSession?.date || null,
        };
      })
    );

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Get subgroup performance overview (aggregated per course)
 * GET /api/teacher/subgroups/performance
 * Protected (Teacher)
 */
router.get("/performance", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;

    // Fetch all subgroups for this teacher
    const subgroups = await SubGroup.find({ teacher: teacherId }).populate(
      "course",
      "name"
    );

    // Group subgroups by course
    const grouped = {};
    subgroups.forEach((group) => {
      if (!grouped[group.course.name]) grouped[group.course.name] = [];
      grouped[group.course.name].push(group);
    });

    // Compute average attendance per course
    const overview = Object.keys(grouped).map((courseName) => {
      const groups = grouped[courseName];
      const avgAttendance =
        groups.length > 0
          ? (
              groups.reduce((sum, g) => sum + (g.avgAttendance || 0), 0) /
              groups.length
            ).toFixed(1)
          : 0;

      return {
        course: courseName,
        avgAttendance,
        totalSubGroups: groups.length,
      };
    });

    res.json(overview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create or update a subgroup
 * POST /api/teacher/subgroups
 * Protected (Teacher)
 */
router.post("/", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;
    const { name, courseId, students } = req.body;

    let subGroup = await SubGroup.findOne({ name, course: courseId });
    if (subGroup) {
      // Update existing subgroup
      subGroup.students = students;
      subGroup.totalStudents = students.length;
      await subGroup.save();
      return res.json({ message: "Subgroup updated", subGroup });
    }

    // Create new subgroup
    subGroup = new SubGroup({
      name,
      course: courseId,
      teacher: teacherId,
      students,
      totalStudents: students.length,
    });

    await subGroup.save();

    // Link to course
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { subGroups: subGroup._id },
    });

    res.status(201).json({ message: "Subgroup created", subGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
