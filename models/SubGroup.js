import mongoose from "mongoose";

const subGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  totalStudents: { type: Number, default: 0 },

  // cached for analytics
  avgAttendance: { type: Number, default: 0 }, // percent
  lastSessionDate: { type: Date, default: null },
}, { timestamps: true });

// lightweight pre-save update: only recalc counts if students changed
subGroupSchema.pre("save", function(next) {
  try {
    if (this.isModified("students")) this.totalStudents = (this.students || []).length;
    next();
  } catch (err) { next(err); }
});

subGroupSchema.index({ course: 1 });
subGroupSchema.index({ teacher: 1 });

export default mongoose.models.SubGroup || mongoose.model("SubGroup", subGroupSchema);
