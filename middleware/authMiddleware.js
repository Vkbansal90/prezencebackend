import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";

//  Protect Student Routes
export const protectStudent = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach logged-in student
      req.student = await Student.findById(decoded.id).select("-password");
      if (!req.student) {
        return res.status(401).json({ error: "Student not found" });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "Not authorized, invalid token" });
    }
  } else {
    res.status(401).json({ error: "Not authorized, no token" });
  }
};

// Protect Teacher Routes
export const protectTeacher = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach logged-in teacher
      req.teacher = await Teacher.findById(decoded.id).select("-password");
      if (!req.teacher) {
        return res.status(401).json({ error: "Teacher not found" });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "Not authorized, invalid token" });
    }
  } else {
    res.status(401).json({ error: "Not authorized, no token" });
  }
};
