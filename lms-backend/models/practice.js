// models/practice.js
import mongoose from 'mongoose';

const PracticeQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], default: [] },     // [Option1..Option4]
    correctAnswer: { type: String, required: true },
    correctIndex: { type: Number, default: -1 },  // 0..3 if matches, else -1
    level: { type: String, default: 'general' } 
  },
  { _id: false }
);

const PracticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },              // e.g. filename without ext
    category: { type: String, default: 'general' },       // 'easy' / 'mixed'
    totalQuestionCount: { type: Number, default: 0 },
    questions: { type: [PracticeQuestionSchema], default: [] },
    filePath: { type: String },    // public url under /uploads/practice/...
    localPath: { type: String },   // absolute disk path
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export default mongoose.model('Practice', PracticeSchema);
