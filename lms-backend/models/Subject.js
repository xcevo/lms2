// models/Subject.js
import mongoose from 'mongoose';

const LinkedSubjectTestSchema = new mongoose.Schema(
  {
    subjectTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectTest', required: true },
    title: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false }
);


const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    pdfPage: { type: Number, min: 1, default: 1 },           // page number in the chapter PDF
    videoStartSec: { type: Number, min: 0, default: 0 },      // start timestamp (seconds)
    videoEndSec: { type: Number, min: 0, default: 0 },        // end timestamp (seconds) - 0 = no end cap
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ChapterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    // local filesystem paths (served from /uploads)
    pdfPath: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1024,
    },
    videoPath: {
      type: String,
      trim: true,
      maxlength: 1024,
      default: '',
    },

    linkedTest: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', default: null },
    linkedPracticeTest: { type: mongoose.Schema.Types.ObjectId, ref: 'Practice', default: null },
     topics: { type: [TopicSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true } // keep subdocument _id as chapterId
);

const SubjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      unique: true, // one subject name only once
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    // NEW: chapters subdocuments
    chapters: {
      type: [ChapterSchema],
      default: [],
    },

    linkedSubjectTests: {
    type: [LinkedSubjectTestSchema],
    default: [],
},
  },
  
  { timestamps: true }
);

// Helpful index for case-insensitive search (same as before)
SubjectSchema.index({ name: 1 });

const Subject = mongoose.model('Subject', SubjectSchema);
export default Subject;
