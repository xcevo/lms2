import mongoose from 'mongoose'

const NoticeSchema = new mongoose.Schema({}, { timestamps: true, strict: false })
export default mongoose.model('Notice', NoticeSchema)
