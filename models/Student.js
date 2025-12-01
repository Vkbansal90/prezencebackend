import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  department: { type: String, default: "Computer Science" },
  year: { type: String },
  cgpa: { type: Number, default: 0.0 },
  totalCredits: { type: Number, default: 0 },
  profilePic: { type: String, default: "" },

  // enrollment refs (one doc per student-course)
  enrollments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" }],

  // quick aggregated fields for dashboard
  overallAttendanceRate: { type: Number, default: 0 }, // percent
  totalCourses: { type: Number, default: 0 },
  achievements: [
    {
      type: String,
      enum: ["Perfect Attendance", "High Performer", "Consistent Student"],
    },
  ],
}, { timestamps: true });

studentSchema.index({ rollNumber: 1 });
studentSchema.index({ email: 1 });

export default mongoose.models.Student || mongoose.model("Student", studentSchema);
