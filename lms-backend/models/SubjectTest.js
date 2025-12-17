// models/SubjectTest.js
import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    Question: String,
    A: String,
    B: String,
    C: String,
    D: String,
    Answer: String,
  },
  { _id: false }
);

const SubjectTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // Public URL (/uploads/subject-tests/<file>) — controller/route step me set hoga
    filePath: { type: String, required: true },
    // Disk path for preview/download/delete
    localPath: { type: String, required: true },

    duration: { type: Number, default: 0 },           // minutes
    totalQuestionCount: { type: Number, default: 0 },
    passingPercentage: { type: Number, default: 0 },

    questions: [QuestionSchema],
  },
  {
    timestamps: true,
    collection: 'subjectTests', // <— exact collection name as requested
  }
);

export default mongoose.model('SubjectTest', SubjectTestSchema);
