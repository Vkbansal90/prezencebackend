// Seeds MongoDB with a starter data set: 1 teacher, 30 students, 4 courses,
// six weeks of attendance and a two-week timetable (dates relative to "now").
//
//   node scripts/seedDemo.js            -> local DB (mongodb://127.0.0.1/presenz_demo)
//   SEED_MONGO_URL=<url> node scripts/seedDemo.js [--reset]   -> any other DB
//
// SEED_PASSWORD sets the login password for every seeded account (sign in as
// demo.student@presenz.local / demo.teacher@presenz.local). Without it the
// password is random, which only suits DISABLE_AUTH demo mode.
// The target database is wiped first; a non-local database that already has
// data is only wiped when --reset is passed.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Course from "../models/Course.js";
import SubGroup from "../models/SubGroup.js";
import Enrollment from "../models/Enrollment.js";
import ClassSession from "../models/ClassSession.js";
import AttendanceLog from "../models/AttendanceLog.js";
import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from "../middleware/authMiddleware.js";

const MONGO_URL = process.env.SEED_MONGO_URL || "mongodb://127.0.0.1:27017/presenz_demo";
const isLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(MONGO_URL);
const reset = process.argv.includes("--reset");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CAMPUS = { lat: 30.3564, lng: 76.3647 }; // Thapar Institute, Patiala

// deterministic pseudo-random so every seed run looks the same
let seedState = 42;
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};

const STUDENT_NAMES = [
  "Aarav Sharma", "Ananya Gupta", "Rohan Mehta", "Ishita Verma", "Kabir Singh",
  "Diya Kapoor", "Arjun Nair", "Meera Iyer", "Vivaan Joshi", "Saanvi Reddy",
  "Aditya Rao", "Kiara Malhotra", "Reyansh Bhatia", "Tara Chawla", "Dhruv Saxena",
  "Navya Arora", "Yash Agarwal", "Riya Bansal", "Kunal Sethi", "Pooja Mishra",
  "Siddharth Jain", "Aisha Khan", "Manav Gill", "Sneha Pillai", "Harsh Vardhan",
  "Simran Kaur", "Nikhil Desai", "Tanvi Kulkarni", "Raghav Sood",
];

const COURSES = [
  { name: "Machine Learning", code: "UML501", color: "#2b9cdb", group: "3CO12", room: "LT-101", building: "LT Block", time: ["09:00", "09:50"], days: [1, 3, 5] },
  { name: "Computer Networks", code: "UCS414", color: "#f39c12", group: "3CO14", room: "C-204", building: "C Block", time: ["11:00", "11:50"], days: [1, 2, 4] },
  { name: "Database Management Systems", code: "UCS310", color: "#27ae60", group: "3CO15", room: "LP-103", building: "LP Block", time: ["14:00", "14:50"], days: [2, 4, 5] },
  { name: "Natural Language Processing", code: "UCS772", color: "#8e44ad", group: "3CO17", room: "F-302", building: "F Block", time: ["16:00", "16:50"], days: [1, 3, 4] },
];

const atTime = (day, hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};
const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

async function main() {
  await mongoose.connect(MONGO_URL);
  if (!isLocal && !reset && (await Student.estimatedDocumentCount()) > 0) {
    console.error("This database already has students. Pass --reset to wipe and re-seed it.");
    process.exit(1);
  }
  await mongoose.connection.dropDatabase();

  if (!process.env.SEED_PASSWORD) console.log("SEED_PASSWORD not set: accounts get a random password.");
  const password = await bcrypt.hash(process.env.SEED_PASSWORD || crypto.randomBytes(24).toString("hex"), 10);

  // insertMany skips the model's pre-save hook, which would hash the hash again
  const [teacher] = await Teacher.insertMany([{
    name: "Dr. Neha Sharma",
    email: DEMO_TEACHER_EMAIL,
    password,
    department: "Computer Science & Engineering",
    designation: "Associate Professor",
    phone: "+91 98765 43210",
  }]);

  const studentDocs = [
    { name: "Demo Student", email: DEMO_STUDENT_EMAIL, rollNumber: "102300001", cgpa: 8.7, attendance: 0.88 },
    ...STUDENT_NAMES.map((name, i) => ({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@presenz.local`,
      rollNumber: String(102300002 + i),
      cgpa: Math.round((6.5 + rand() * 3) * 10) / 10,
      attendance: 0.6 + rand() * 0.38, // per-student likelihood of showing up
    })),
  ];
  const students = await Student.insertMany(
    studentDocs.map(({ attendance, ...s }) => ({
      ...s,
      password,
      department: "Computer Science",
      year: "3rd Year",
      totalCredits: 96,
    }))
  );
  const showUpRate = new Map(students.map((s, i) => [String(s._id), studentDocs[i].attendance]));

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const sessions = [];
  const logs = [];
  const enrollments = [];
  const courses = [];

  for (const [ci, c] of COURSES.entries()) {
    const course = new Course({
      name: c.name, code: c.code, shortTitle: c.code, teacher: teacher._id, courseColorTag: c.color,
    });
    // demo student is in every course; the rest are a rotating slice of the class
    const members = [students[0], ...students.slice(1).filter((_, i) => (i + ci) % 4 !== 0)];
    const group = new SubGroup({
      name: c.group, course: course._id, teacher: teacher._id, students: members.map((s) => s._id),
    });
    course.subGroups = [group._id];
    const location = { room: c.room, building: c.building, address: `${c.building}, Thapar Institute`, ...CAMPUS };
    const base = {
      course: course._id, subGroup: group._id, teacher: teacher._id, location,
      enrolledStudents: members.map((s) => s._id), totalStudents: members.length,
    };

    const tally = new Map(members.map((s) => [String(s._id), { attended: 0, total: 0 }]));
    let lastSessionDate = null;

    // past 6 weeks: completed sessions with attendance
    for (let back = 42; back >= 1; back--) {
      const day = new Date(today);
      day.setDate(day.getDate() - back);
      if (!c.days.includes(day.getDay())) continue;
      const date = atTime(day, c.time[0]);
      const session = new ClassSession({
        ...base, date, dayOfWeek: DAYS[date.getDay()], startTime: c.time[0], endTime: c.time[1],
        type: "Lecture", status: "completed",
      });
      sessions.push(session);
      lastSessionDate = date;
      for (const s of members) {
        const present = rand() < showUpRate.get(String(s._id));
        const t = tally.get(String(s._id));
        t.total += 1;
        if (present) t.attended += 1;
        logs.push({
          student: s._id, session: session._id, course: course._id, date,
          isPresent: present, verifiedFace: present, verifiedLocation: present,
          locationCoords: present ? CAMPUS : undefined,
          status: present ? "completed" : "failed",
          statusReason: present ? undefined : "Absent",
        });
      }
    }

    // today: one class in progress right now, plus later ones spread over the day
    if (ci === 0) {
      const start = new Date(now.getTime() - 10 * 60000);
      const end = new Date(now.getTime() + 40 * 60000);
      sessions.push(new ClassSession({
        ...base, date: start, dayOfWeek: DAYS[start.getDay()], startTime: hhmm(start), endTime: hhmm(end),
        type: "Lecture", status: "ongoing",
      }));
    } else {
      const start = new Date(now.getTime() + ci * 60 * 60000);
      const end = new Date(start.getTime() + 50 * 60000);
      if (start.getDate() === now.getDate()) {
        sessions.push(new ClassSession({
          ...base, date: start, dayOfWeek: DAYS[start.getDay()], startTime: hhmm(start), endTime: hhmm(end),
          type: ci === 2 ? "Lab" : "Lecture", status: "upcoming",
        }));
      }
    }

    // next 2 weeks: regular timetable
    for (let ahead = 1; ahead <= 14; ahead++) {
      const day = new Date(today);
      day.setDate(day.getDate() + ahead);
      if (!c.days.includes(day.getDay())) continue;
      const date = atTime(day, c.time[0]);
      sessions.push(new ClassSession({
        ...base, date, dayOfWeek: DAYS[date.getDay()], startTime: c.time[0], endTime: c.time[1],
        type: "Lecture", status: "upcoming",
      }));
    }

    let rateSum = 0;
    for (const s of members) {
      const t = tally.get(String(s._id));
      const rate = t.total ? Math.round((t.attended / t.total) * 1000) / 10 : 0;
      rateSum += rate;
      enrollments.push(new Enrollment({
        student: s._id, course: course._id, subGroup: group._id,
        attendedClasses: t.attended, totalClasses: t.total, attendanceRate: rate,
      }));
    }
    group.avgAttendance = Math.round((rateSum / members.length) * 10) / 10;
    group.lastSessionDate = lastSessionDate;
    await group.save();
    await course.save();
    courses.push(course);
  }

  await ClassSession.insertMany(sessions);
  await AttendanceLog.insertMany(logs);
  await Enrollment.insertMany(enrollments);

  // denormalized fields on students / teacher
  for (const s of students) {
    const mine = enrollments.filter((e) => String(e.student) === String(s._id));
    const overall = mine.length ? mine.reduce((sum, e) => sum + e.attendanceRate, 0) / mine.length : 0;
    await Student.updateOne({ _id: s._id }, {
      enrollments: mine.map((e) => e._id),
      totalCourses: mine.length,
      overallAttendanceRate: Math.round(overall * 10) / 10,
    });
  }
  const avg = enrollments.reduce((sum, e) => sum + e.attendanceRate, 0) / enrollments.length;
  await Teacher.updateOne({ _id: teacher._id }, {
    courses: courses.map((c) => c._id),
    avgAttendance: Math.round(avg * 10) / 10,
  });

  console.log(`Seeded ${isLocal ? MONGO_URL : mongoose.connection.name + " (remote)"}`);
  console.log(`  1 teacher, ${students.length} students, ${courses.length} courses`);
  console.log(`  ${sessions.length} sessions, ${logs.length} attendance logs, ${enrollments.length} enrollments`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
