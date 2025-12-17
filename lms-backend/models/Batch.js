import mongoose from 'mongoose'

const BatchSchema = new mongoose.Schema({}, { timestamps: true, strict: false })
export default mongoose.model('Batch', BatchSchema)
