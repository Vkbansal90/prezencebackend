
import mongoose from "mongoose";
import AttendanceLog from "./AttendanceLog.js";

const subGroupSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Group A"
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  totalStudents: { type: Number, default: 0 },
  lastSessionDate: { type: Date },
  avgAttendance: { type: Number, default: 0 },
});

//pre-save hook
subGroupSchema.pre("save", async function (next) {
  try {
    // Avoid running attendance calculations if no students exist
    if (!this.students || this.students.length === 0) {
      this.avgAttendance = 0;
      return next();
    }

    // Count attendance logs for this subgroup
    const presentCount = await AttendanceLog.countDocuments({
      course: this.course,
      student: { $in: this.students },
      status: "completed",
    });

    const total = this.students.length;
    this.avgAttendance = total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;

    next();
  } catch (err) {
    console.error("Error calculating subgroup avg attendance:", err.message);
    next();
  }
});

export default mongoose.model("SubGroup", subGroupSchema);
