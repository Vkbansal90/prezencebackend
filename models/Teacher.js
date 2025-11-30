// models/Teacher.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String },
  designation: { type: String, default: "Lecturer" },
  phone: { type: String },
  profileImage: { type: String },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

  // Analytics-related
  lastLogin: { type: Date, default: Date.now },
  avgAttendance: { type: Number, default: 0 },
  engagementRate: { type: Number, default: 0 },
});

// Hash password before save
teacherSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

teacherSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Teacher", teacherSchema);
