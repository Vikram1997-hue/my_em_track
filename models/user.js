const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 2,
        maxLength: 30,
        required: true,
    },
    username: {
        type: String,
        minLength: 3,
        maxLength: 30,
        unique: true,
        required: true,
    },
    email: {
        type: String,
        minLength: 6,
        maxLength: 45,
        lowercase: true,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        minLength: 8,
        maxLength: 60,
        required: true,
    },
    employeeId: {
        type: String,
        minLength: 1,
        unique: true,
        required: true,
    },
    profilePic: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['employee', 'subAdmin', 'superAdmin'],
        required: true,
    },
    employees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    ],
    token: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema, 'Users');