import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  subGroup: { type: mongoose.Schema.Types.ObjectId, ref: "SubGroup" }, // optional
  enrolledOn: { type: Date, default: Date.now },

  attendedClasses: { type: Number, default: 0 },
  totalClasses: { type: Number, default: 0 },
  attendanceRate: { type: Number, default: 0 }, // percent
}, { timestamps: true });

enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);

