import mongoose from "mongoose";

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

export default mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

