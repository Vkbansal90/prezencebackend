import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  professor: { type: String, required: true },

  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  subGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubGroup" }],
});

export default mongoose.model("Course", courseSchema);
