import mongoose from "mongoose";

const attendanceLogSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSession", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  date: { type: Date, required: true, default: Date.now }, // session date for quick filters
  isPresent: { type: Boolean, default: false },
  verifiedFace: { type: Boolean, default: false },
  verifiedLocation: { type: Boolean, default: false },
  locationCoords: { lat: Number, lng: Number },
  status: { type: String, enum: ["completed","failed","pending"], default: "completed" },
  statusReason: { type: String },
}, { timestamps: true });

// one per (student, session)
attendanceLogSchema.index({ student: 1, session: 1 }, { unique: true });
attendanceLogSchema.index({ course: 1, student: 1 });
attendanceLogSchema.index({ session: 1 });
attendanceLogSchema.index({ student: 1, date: 1 });

export default mongoose.models.AttendanceLog || mongoose.model("AttendanceLog", attendanceLogSchema);

