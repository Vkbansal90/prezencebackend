import mongoose from "mongoose";

const classSessionSchema = new mongoose.Schema({
  // Core References
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  subGroup: { type: mongoose.Schema.Types.ObjectId, ref: "SubGroup" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },

  // Schedule & Timing
  date: { type: Date, required: true },
  dayOfWeek: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  startTime: { type: String, required: true }, // e.g. "09:00"
  endTime: { type: String, required: true },   // e.g. "10:30"

  // Location
  location: {
    room: String,
    building: String,
    lat: Number,
    lng: Number,
    address: String,
  },

  // Class Details
  instructor: { type: String },
  type: { type: String, enum: ["Lecture", "Lab"], default: "Lecture" },
  note: { type: String },

  // Attendance Info
  totalStudents: { type: Number, default: 0 },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],

  // Class State
  status: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled"],
    default: "upcoming",
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update `updatedAt` before saving
classSessionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("ClassSession", classSessionSchema);
