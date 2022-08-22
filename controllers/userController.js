const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
// const express = require('express')

require('dotenv').config()
const conn = require("../config/db.config")
const User = require("../models/user")
const TimeLogs = require("../models/timeLogs")



async function findById(id) {
    
    const currentUser = await User.findById(id)
    return currentUser
}

// const setProfilePic = async (req, res) => {

//     const currentUser = await User.findById()

// }





const getAll = async (req, res) => {     //FOR THIS TO WORK - SEND JWT IN AUTHORIZATION HEADER

    
    //at this point, it is assumed that our guy is signed in
    if(!req.headers.authorization) { 
        console.error(new Error("Authentication error in /user/getAll"))
    }

    const receivedToken = req.headers.authorization.split(" ")[1]

    if(receivedToken == null) {
        console.log("entered token null error")
        return res.sendStatus(401)
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {

        if(err) {
            console.error("Error in JWT verification:", err)
            return res.sendStatus(403)
        }

        req.userData = userData
    })
    
    const currentUser = await findById(req.userData._id)

    const ans = {
        name: currentUser.name,
        email: currentUser.email,
        employeeId: currentUser.employeeId,
        profilePic: currentUser.profilePic
    }

    res.send(ans)
}


module.exports = {
    // setProfilePic,
    getAll
}