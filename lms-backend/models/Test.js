// models/Test.js
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

const TestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // Public URL you can open in the browser (/uploads/tests/<file>)
    filePath: { type: String, required: true },
    // Absolute/relative path on disk (for preview/download/delete)
    localPath: { type: String, required: true },

    duration: { type: Number, default: 0 },                  // minutes
    randomizedQuestionCount: { type: Number, default: 0 },
    totalQuestionCount: { type: Number, default: 0 },
    passingPercentage: { type: Number, default: 0 },

    questions: [QuestionSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Test', TestSchema);
