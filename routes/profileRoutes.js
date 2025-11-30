import express from "express";
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import AttendanceLog from "../models/AttendanceLog.js";

const router = express.Router();

/**
 * Get student profile
 * GET /api/profile/:studentId
 */
router.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate({
      path: "courses",
      populate: { path: "course", select: "name professor" },
    });

    if (!student) return res.status(404).json({ error: "Student not found" });

    // Achievements calculation
    const perfectAttendance = await Enrollment.countDocuments({
      student: studentId,
      attendanceRate: { $gte: 95 },
    });

    const highPerformer = await Enrollment.countDocuments({
      student: studentId,
      attendanceRate: { $gte: 85 },
    });

    const consistent = await AttendanceLog.countDocuments({
      student: studentId,
      status: "completed",
    });

    const achievements = [];
    if (perfectAttendance > 0) achievements.push("Perfect Attendance");
    if (highPerformer > 0) achievements.push("High Performer");
    if (consistent > 10) achievements.push("Consistent Student");

    const profileData = {
      id: student._id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      department: student.department,
      year: student.year,
      gpa: student.gpa,
      totalCredits: student.totalCredits,
      enrollmentDate: student.enrollmentDate,
      phone: student.phone,
      address: student.address,
      notificationPreferences: student.notificationPreferences,
      achievements,
    };

    res.json(profileData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update profile information
 * PUT /api/profile/:studentId
 */
router.put("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const updates = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(studentId, updates, {
      new: true,
    });

    if (!updatedStudent)
      return res.status(404).json({ error: "Student not found" });

    res.json({
      message: "Profile updated successfully",
      student: updatedStudent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update notification preferences
 * PUT /api/profile/:studentId/notifications
 */
router.put("/:studentId/notifications", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { email, sms, push } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    student.notificationPreferences = { email, sms, push };
    await student.save();

    res.json({ message: "Notification preferences updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
