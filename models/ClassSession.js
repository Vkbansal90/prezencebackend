import mongoose from "mongoose";
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const classSessionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  subGroup: { type: mongoose.Schema.Types.ObjectId, ref: "SubGroup", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },

  // session timestamp (use range queries for "today")
  date: { type: Date, required: true },
  dayOfWeek: { type: String, enum: DAYS },

  startTime: { type: String, required: true }, // "10:00"
  endTime: { type: String, required: true },

  location: { room: String, building: String, lat: Number, lng: Number, address: String },

  type: { type: String, default: "Lecture" },
  status: { type: String, enum: ["upcoming","completed","cancelled", "ongoing"], default: "upcoming" },

  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  totalStudents: { type: Number, default: 0 },

  // optional UI helpers
  sessionNotes: { type: String, default: "" },
}, { timestamps: true });

// pre-save light canonicalization
classSessionSchema.pre("save", function(next) {
  try {
    if (this.date && !this.dayOfWeek) this.dayOfWeek = DAYS[new Date(this.date).getDay()];
    if (Array.isArray(this.enrolledStudents)) this.totalStudents = this.enrolledStudents.length;
    next();
  } catch (err) { next(err); }
});

// indexes for fast dashboard queries
classSessionSchema.index({ date: 1 });
classSessionSchema.index({ enrolledStudents: 1 });
classSessionSchema.index({ course: 1, date: 1 });

export default mongoose.models.ClassSession || mongoose.model("ClassSession", classSessionSchema);
