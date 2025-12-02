import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from "dotenv";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import subGroupRoutes from "./routes/subGroupRoutes.js";
import teacherScheduleRoutes from "./routes/teacherScheduleRoutes.js";
import teacherHistoryRoutes from "./routes/teacherHistoryRoutes.js";
import teacherStudentRoutes from "./routes/teacherStudentRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGO_URL = process.env.MONGO_URL;

async function main() {
  return mongoose.connect(MONGO_URL);
}

main()
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.error(" DB connection error:", err.message));

// Root route
app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

// ✅ Add this simple test route below your root route:
app.get("/api/health", (req, res) => {
  res.json({ message: "Backend connected successfully!" });
});

// Main Routes
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/analytics", analyticsRoutes);

// Profile routes (get full student profile by id)
app.use("/api/profile", profileRoutes);

// Teacher Routes
app.use("/api/teacher", teacherRoutes);
app.use("/api/teacher/subgroups", subGroupRoutes);
app.use("/api/teacher/schedule", teacherScheduleRoutes);
app.use("/api/teacher/history", teacherHistoryRoutes);
app.use("/api/teacher/students", teacherStudentRoutes);

// Optional 404 handler
// app.get("/*", (req, res) => {
//   res.status(404).json({ error: "Not found" });
// });

app.listen(process.env.PORT, () => {
  console.log(` Server is listening on port ${process.env.PORT}`);
});
