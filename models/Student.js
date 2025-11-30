import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rollNumber: { type: String },

  // Profile fields
  department: { type: String },
  year: { type: String }, // e.g. "Junior", "Senior"
  gpa: { type: Number, default: 0 },
  totalCredits: { type: Number, default: 0 },
  enrollmentDate: { type: Date, default: Date.now },

  phone: { type: String },
  address: { type: String },

  // Settings
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },

  // Achievements (optional badges)
  achievements: [
    {
      type: String,
      enum: ["Perfect Attendance", "High Performer", "Consistent Student"],
    },
  ],

  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" }],
});

// Password hashing middleware
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password verification
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Student", studentSchema);
