import { Schema, Document } from 'mongoose';
import { Attendance } from "@/types"

const AttendanceSchema = new Schema<Attendance & Document>({
  academicYear: { type: String, required: true },
  date: { type: Date, required: true },
  classId: { type: String, required: true },
  presentStudentIds: { type: [String], required: true },
  absentStudentIds: { type: [String], required: true },
  recordedBy: { type: String, required: false },
  seq: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null },
});

export default AttendanceSchema;