import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";

// Demo mode: DISABLE_AUTH=true lets requests without a valid token through
// as the demo student / teacher (see scripts/seedDemo.js). Off by default.
const authDisabled = () => process.env.DISABLE_AUTH === "true";
export const DEMO_STUDENT_EMAIL = "demo.student@presenz.local";
export const DEMO_TEACHER_EMAIL = "demo.teacher@presenz.local";

// Resolve the user from the Bearer token, or null if missing / invalid
const userFromToken = async (req, Model) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer")) return null;
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    return await Model.findById(decoded.id).select("-password");
  } catch (err) {
    return null;
  }
};

//  Protect Student Routes
export const protectStudent = async (req, res, next) => {
  try {
    req.student = await userFromToken(req, Student);
    if (!req.student && authDisabled()) {
      req.student = await Student.findOne({ email: DEMO_STUDENT_EMAIL }).select("-password");
    }
    if (!req.student) {
      return res.status(401).json({ error: "Not authorized, invalid or missing token" });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Protect Teacher Routes
export const protectTeacher = async (req, res, next) => {
  try {
    req.teacher = await userFromToken(req, Teacher);
    if (!req.teacher && authDisabled()) {
      req.teacher = await Teacher.findOne({ email: DEMO_TEACHER_EMAIL }).select("-password");
    }
    if (!req.teacher) {
      return res.status(401).json({ error: "Not authorized, invalid or missing token" });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
