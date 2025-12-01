// controllers/studentController.js
import ClassSession from "../models/ClassSession.js";
import SubGroup from "../models/SubGroup.js";

export async function getTodaysSessionsForStudent(req, res) {
  try {
    // assume auth middleware sets req.user.id; fallback to param
    const studentId = req.user?.id || req.params.studentId;
    if (!studentId) return res.status(400).json({ success: false, message: "Missing student id" });

    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);

    // Defensive: check both enrolledStudents and subgroup membership
    const subGroups = await SubGroup.find({ students: studentId }).select("_id").lean();
    const subGroupIds = subGroups.map(s => s._id);

    const sessions = await ClassSession.find({
      date: { $gte: start, $lte: end },
      status: { $in: ["upcoming","completed"] },
      $or: [
        { enrolledStudents: studentId },
        { subGroup: { $in: subGroupIds } }
      ]
    })
      .populate("course", "name code shortTitle courseColorTag")
      .populate("subGroup", "name")
      .lean();

    return res.json({ success: true, sessions });
  } catch (err) {
    console.error("getTodaysSessionsForStudent error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
