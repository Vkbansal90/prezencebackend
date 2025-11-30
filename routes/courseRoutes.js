import express from "express";
import Course from "../models/Course.js";
const router = express.Router();

// GET all courses
router.get("/", async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

export default router;
