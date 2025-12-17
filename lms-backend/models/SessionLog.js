import mongoose from 'mongoose'

const SessionLogSchema = new mongoose.Schema({}, { timestamps: true, strict: false })
export default mongoose.model('SessionLog', SessionLogSchema)
