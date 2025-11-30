// models/AttendanceLog.js
import mongoose from "mongoose";


const attendanceLogSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSession", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
  date: { type: Date, default: Date.now },
  verifiedFace: { type: Boolean, default: false },
  verifiedLocation: { type: Boolean, default: false },
  isPresent: { type: Boolean, default: false },
  statusReason: { type: String },
  locationCoords: {
    lat: Number,
    lng: Number,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  }
});

export default mongoose.model("AttendanceLog", attendanceLogSchema);
