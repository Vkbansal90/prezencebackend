import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true }, // optional short code
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  courseColorTag: { type: String, default: "#2b9cdb" }, // UI badge color
  shortTitle: { type: String },

  subGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubGroup" }],
}, { timestamps: true });

courseSchema.index({ teacher: 1 });
courseSchema.index({ name: "text" });

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
