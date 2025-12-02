import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  department: { type: String },
  designation: { type: String },
  phone: { type: String },

  // convenience / denormalized
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  avgAttendance: { type: Number, default: 0 },
  engagementRate: { type: Number, default: 0 },
}, { timestamps: true });

teacherSchema.index({ email: 1 });

// Hash password before saving
teacherSchema.pre("save", async function (next) {
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
teacherSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

