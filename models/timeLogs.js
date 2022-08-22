const mongoose = require('mongoose')

const TimeLogsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    checkIn: [
        {
            type: Date,
            required: true,
        },
    ],
    checkOut: [
        {
            type: Date,
            required: true,
        },
    ],
    workHour: {
        type: Number,
        default: 0,
        required: true,
        min: 0,
        max: 24,
    },
}, { timestamps: true });

module.exports = mongoose.model('TimeLogs', TimeLogsSchema, 'TimeLogs');