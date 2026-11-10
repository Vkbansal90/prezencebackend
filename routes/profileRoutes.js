import express from "express";
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import AttendanceLog from "../models/AttendanceLog.js";
import { protectStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

// A student may only read and change their own profile
router.use("/:studentId", protectStudent, (req, res, next) => {
  if (String(req.student._id) !== req.params.studentId) {
    return res.status(403).json({ error: "Not allowed to access this profile" });
  }
  next();
});

/**
 * Get student profile
 * GET /api/profile/:studentId
 */
router.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // Load student basic info (no invalid `courses` populate - Enrollment stores courses)
    const student = await Student.findById(studentId).select('-password').lean();

    // Fetch enrollments and populate course info to include in profile
    const enrollments = await Enrollment.find({ student: studentId })
      .populate({ path: 'course', select: 'name professor shortTitle building room' })
      .lean();

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
      gpa: student.cgpa,
      totalCredits: student.totalCredits,
      enrollmentDate: student.createdAt,
      phone: student.phone,
      address: student.address,
      notificationPreferences: student.notificationPreferences,
      achievements,
      courses: enrollments.map(e => ({
        id: e.course?._id,
        name: e.course?.name,
        professor: e.course?.professor,
        shortTitle: e.course?.shortTitle,
        building: e.course?.building,
        room: e.course?.room,
        attendedClasses: e.attendedClasses,
        totalClasses: e.totalClasses,
        attendanceRate: e.attendanceRate,
      })),
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
    // only these fields are editable from the app
    const updates = {};
    for (const key of ["name", "phone", "address"]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updatedStudent = await Student.findByIdAndUpdate(studentId, updates, {
      new: true,
    }).select("-password");

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

/**
 * Change Password
 * PUT /api/profile/:studentId/password
 */
router.put("/:studentId/password", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { oldPassword, newPassword } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Verify old password
    const isMatch = await student.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect old password" });
    }

    // Update password (pre-save hook will hash it)
    student.password = newPassword;
    await student.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
