import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  attendedClasses: { type: Number, default: 0 },
  totalClasses: { type: Number, default: 0 },
  attendanceRate: { type: Number, default: 0 }, // (attendedClasses / totalClasses) * 100
  nextClass: {
    day: String,   // e.g., "Today" / "Tomorrow" / "Mon"
    time: String,  // e.g., "10:00 AM"
  },
});

export default mongoose.model("Enrollment", enrollmentSchema);
