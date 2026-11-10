import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  notificationPreferences: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },

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

// Hash password before saving
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.Student || mongoose.model("Student", studentSchema);
