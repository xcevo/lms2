// models/Candidate.js
import mongoose from 'mongoose';

const SubjectSelectionSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    name: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const TestResultSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    scorePercentage: { type: Number, min: 0, max: 100, required: true },
    status: {
      type: String,
      enum: ['pass', 'fail', 'incomplete'],
      required: true,
    },
    attemptCount: { type: Number, min: 1, default: 1 },
    attemptedAt: { type: Date, default: Date.now },
    timeTakenSec: { type: Number, min: 0, default: 0 },
  },
  { _id: true, timestamps: false }
);

const SubtestResultSchema = new mongoose.Schema(
  {
    subjectTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectTest',
      required: true,
    },
    scorePercentage: { type: Number, min: 0, max: 100, required: true },
    status: { type: String, enum: ['pass', 'fail', 'incomplete'], required: true },
    attemptCount: { type: Number, min: 1, default: 1 },
    attemptedAt: { type: Date, default: Date.now },
    timeTakenSec: { type: Number, min: 0, default: 0 },
  },
  { _id: true, timestamps: false }
);

const PracticeResultSchema = new mongoose.Schema(
  {
    practice: { type: mongoose.Schema.Types.ObjectId, ref: 'Practice', required: true }, // practice test id
    subject:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },                  // optional, helpful for queries
    chapter:  { type: mongoose.Schema.Types.ObjectId },                                  // optional subdoc _id
    level:    { type: String, trim: true },                                              // 'easy' | 'medium' | 'hard' (etc.)
    attempted:    { type: Number, min: 0, default: 0 },
    correct:      { type: Number, min: 0, default: 0 },
    scorePercent: { type: Number, min: 0, max: 100, default: 0 },
    updatedAt:    { type: Date, default: Date.now },
  },
  { _id: true }
);

const candidateSchema = new mongoose.Schema(
  {
    parentEmail: { type: String, required: true, lowercase: true, trim: true },
    parentPhoneE164: { type: String, required: true }, // +<country><number>
    country: { type: String, required: true },         // ISO alpha-2, e.g. "IN"
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true },

    passwordHash: { type: String, required: true },
    passwordPlain: { type: String, required: true },

    // NEW unified structure: each selection has both id + name
    subjects: { type: [SubjectSelectionSchema], default: [] },

    // (Optional) If you want to keep legacy fields around for reads/migration,
    // uncomment these lines. They are NOT required anymore.
    // legacySubjectNames: [{ type: String, trim: true }],
    // legacySubjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    // NEW: array of test attempts/results
    testResults: { type: [TestResultSchema], default: [] },
    practiceResults: { type: [PracticeResultSchema], default: [] },
    subtestResults: { type: [SubtestResultSchema], default: [] },

    method: { type: String, required: true },          // chosen payment method
  },
  { timestamps: true, collection: 'candidates' }
);

// Helpful indexes
candidateSchema.index({ username: 1 }, { sparse: true });
candidateSchema.index({ 'subjects.subjectId': 1 });
candidateSchema.index({ 'testResults.testId': 1 });
candidateSchema.index({ 'subtestResults.subjectTestId': 1 });


export default mongoose.model('Candidate', candidateSchema);



