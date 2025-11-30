import express from "express";
import AttendanceLog from "../models/AttendanceLog.js";
import ClassSession from "../models/ClassSession.js";
import Enrollment from "../models/Enrollment.js";
import { protectStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

// Utility: Calculate distance using Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 *  Verify Student Location
 * POST /api/attendance/verify-location
 * Protected route (student)
 * Body: { sessionId, lat, lng }
 */
router.post("/verify-location", protectStudent, async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;
    const studentId = req.student._id; //From verified JWT

    // Find class session
    const session = await ClassSession.findById(sessionId).populate("course");
    if (!session)
      return res.status(404).json({ error: "Class session not found." });

    // Compute distance
    const distance = getDistance(
      lat,
      lng,
      session.location.lat,
      session.location.lng
    );
    const withinRange = distance <= 50; // 50m allowed radius

    // Create or update log
    let log = await AttendanceLog.findOne({ student: studentId, session: sessionId });
    if (!log) {
      log = new AttendanceLog({
        student: studentId,
        course: session.course._id,
        session: sessionId,
      });
    }

    log.verifiedLocation = withinRange;
    log.locationCoords = { lat, lng };
    log.status = "pending"; // waiting for face verification
    await log.save();

    res.json({
      message: withinRange
        ? "Location verified within 50m radius"
        : "Out of range",
      withinRange,
      distance: Math.round(distance),
      sessionLocation: session.location.address,
      course: session.course.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark Attendance (after face verification)
 * POST /api/attendance/mark
 * Protected route (student)
 * Body: { sessionId, verifiedFace: true }
 */
router.post("/mark", protectStudent, async (req, res) => {
  try {
    const { sessionId, verifiedFace } = req.body;
    const studentId = req.student._id; // from JWT token

    // Find latest log
    const log = await AttendanceLog.findOne({
      student: studentId,
      session: sessionId,
    }).sort({ date: -1 });

    if (!log)
      return res.status(400).json({ error: "No location verification found." });

    // Check both verifications
    if (!log.verifiedLocation || !verifiedFace) {
      log.status = "failed";
      log.verifiedFace = verifiedFace || false;
      await log.save();
      return res.status(403).json({ message: "Verification failed." });
    }

    // Mark attendance completed
    log.verifiedFace = verifiedFace;
    log.status = "completed";
    await log.save();

    // Update enrollment stats
    const session = await ClassSession.findById(sessionId).populate("course");
    const courseId = session.course._id;

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (!enrollment)
      return res.status(404).json({ error: "Enrollment record not found." });

    enrollment.attendedClasses += 1;
    enrollment.totalClasses += 1;
    enrollment.attendanceRate =
      enrollment.totalClasses > 0
        ? (
            (enrollment.attendedClasses / enrollment.totalClasses) *
            100
          ).toFixed(1)
        : 0;

    await enrollment.save();

    res.json({
      message: "Attendance marked successfully",
      course: session.course.name,
      sessionDate: session.date,
      attendanceRate: enrollment.attendanceRate,
      log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
