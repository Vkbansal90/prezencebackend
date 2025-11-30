import express from "express";
import ClassSession from "../models/ClassSession.js";
import Course from "../models/Course.js";
import AttendanceLog from "../models/AttendanceLog.js";
import SubGroup from "../models/SubGroup.js";
import Enrollment from "../models/Enrollment.js";
import { protectTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Course-wise Overview
 * GET /api/teacher/history/overview
 * Protected (Teacher)
 */
router.get("/overview", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;

    // Fetch teacher’s courses
    const courses = await Course.find({ teacher: teacherId });

    const overview = await Promise.all(
      courses.map(async (course) => {
        // Completed sessions
        const totalClasses = await ClassSession.countDocuments({
          course: course._id,
          status: "completed",
        });

        // Average attendance (based on AttendanceLog)
        const completedLogs = await AttendanceLog.find({
          course: course._id,
          status: { $in: ["completed", "failed"] },
        });

        const presentCount = completedLogs.filter(
          (log) => log.status === "completed"
        ).length;
        const absentCount = completedLogs.filter(
          (log) => log.status === "failed"
        ).length;

        const avgAttendance =
          presentCount + absentCount > 0
            ? ((presentCount / (presentCount + absentCount)) * 100).toFixed(1)
            : 0;

        // Students count (from Enrollment)
        const totalStudents = await Enrollment.countDocuments({
          course: course._id,
        });

        return {
          courseName: course.name,
          totalClasses,
          avgAttendance,
          totalStudents,
        };
      })
    );

    res.json(overview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 *  All Completed Classes (Detailed List)
 * GET /api/teacher/history/all
 * Protected (Teacher)
 * Optional query params: ?courseId=...&subGroupId=...
 */
router.get("/all", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;
    const { courseId, subGroupId } = req.query;

    const filters = {
      teacher: teacherId,
      status: "completed",
    };

    if (courseId) filters.course = courseId;
    if (subGroupId) filters.subGroup = subGroupId;

    const sessions = await ClassSession.find(filters)
      .populate("course", "name")
      .populate("subGroup", "name")
      .sort({ date: -1 });

    // Enrich sessions with attendance summary
    const history = await Promise.all(
      sessions.map(async (session) => {
        const total = session.totalStudents;

        const presentCount = await AttendanceLog.countDocuments({
          session: session._id,
          status: "completed",
        });
        const absentCount = await AttendanceLog.countDocuments({
          session: session._id,
          status: "failed",
        });

        const attendanceRate =
          total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;

        return {
          id: session._id,
          courseName: session.course.name,
          groupName: session.subGroup ? session.subGroup.name : "All Students",
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          present: presentCount,
          absent: absentCount,
          totalStudents: total,
          attendanceRate,
        };
      })
    );

    res.json({
      count: history.length,
      classes: history,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 *  Export Class History Report (CSV)
 * GET /api/teacher/history/export
 * Protected (Teacher)
 */
router.get("/export", protectTeacher, async (req, res) => {
  try {
    const teacherId = req.teacher._id;
    const sessions = await ClassSession.find({
      teacher: teacherId,
      status: "completed",
    })
      .populate("course", "name")
      .populate("subGroup", "name");

    const csvRows = ["Course,SubGroup,Date,Start Time,End Time,Attendance Rate"];
    for (const s of sessions) {
      const total = s.totalStudents || 0;
      const present = await AttendanceLog.countDocuments({
        session: s._id,
        status: "completed",
      });
      const attendanceRate =
        total > 0 ? ((present / total) * 100).toFixed(1) : 0;

      csvRows.push(
        `${s.course.name},${s.subGroup ? s.subGroup.name : "All"},${
          s.date.toISOString().split("T")[0]
        },${s.startTime},${s.endTime},${attendanceRate}%`
      );
    }

    res.header("Content-Type", "text/csv");
    res.attachment("class_history_report.csv");
    res.send(csvRows.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
