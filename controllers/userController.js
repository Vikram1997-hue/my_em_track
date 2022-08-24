const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

require('dotenv').config()
const conn = require("../config/db.config")
const User = require("../models/user")
const TimeLogs = require("../models/timeLogs")



async function findByIdUser(id) {
    
    const currentUser = await User.findById(id)
    return currentUser
}

async function findByIdTimeLogs(userId, today) {
    const doc = await TimeLogs.findOne({user: userId, date: today})
    return doc
}


// const setProfilePic = async (req, res) => {

//     const currentUser = await User.findById()

// }


const getAll = async (req, res) => {     //FOR THIS TO WORK - SEND JWT IN AUTHORIZATION HEADER
    
    //at this point, it is assumed that our guy is signed in
    if(!req.headers.authorization) { 
        return res.status(401).send("Log in and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]

    if(receivedToken == null) {
        console.log("entered token null error")
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, (err, userData) => {

        if(err) {
            console.error("Error in JWT verification:", err)
            return res.status(403).send(err)
        }

        req.userData = userData
    })
    
    const currentUser = await findByIdUser(req.userData._id)

    const ans = {
        name: currentUser.name,
        email: currentUser.email,
        employeeId: currentUser.employeeId,
        profilePic: currentUser.profilePic
    }

    res.send(ans)
}


const changePassword = async (req,res) => {

    //as always, I expect that we are already logged in
    if(!req.headers.authorization) {
        return res.status(401).send("Log in and try again")
    }

    if(!req.body || !req.body.oldPassword || !req.body.newPassword || !req.body.newPasswordConfirm) {
        return res.status(400).send("oldPassword, newPassword, and newPasswordConfirm all must be passed")
    }

    if(req.body.newPassword.localeCompare(req.body.newPasswordConfirm) != 0) {
        return res.status(400).send("newPassword and newPasswordConfirm must match!")
    }


    const receivedToken = req.headers.authorization.split(" ")[1]
    
    //obtain our guy from JWT
    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {
        if(err) {
            console.error("Error in JWT verification", err)
            return res.status(403).send(err)
        }


        //if we are here, it's definitely our guy
        req.userData = userData;
    })


    console.log("userdata:", req.userData._id)

    const currentUser = await findByIdUser(req.userData._id)
    const fetchedPassword = currentUser.password
    // console.log(fetchedPassword)
    const passwordMatch = await bcrypt.compare(req.body.oldPassword, fetchedPassword)
    console.log("passwordMatch:", passwordMatch)


    if(passwordMatch == false) {
        return res.status(403).send("Incorrect password entered")
    }

    const newHashedPassword = await bcrypt.hash(req.body.newPassword, 10)
    // console.log("Your new password is:", newHashedPassword)
    

    // console.log("before:", currentUser, currentUser.password)
    currentUser.password = newHashedPassword;
    currentUser.save()
    res.status(200).send("Password has been updated!") //FUTURE: NODEMAILER NOTIF
}



const forgotPassword = (req, res) => {

    if(!req.body || !req.body.email) {
        return res.status(400).send("Please enter your email")
    }
    // console.log("aur ji")


    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ranterdudewtd@gmail.com',
            pass: 'fwsokyakdroicdwc'
        }
    });
      
    let mailOptions = {
        from: 'ranterdudewtd@gmail.com',
        to: req.body.email,
        subject: 'RESET PASSWORD LINK',
        text: '<UI link to Reset Password page>' //DOUBT: how do we actually do this?
    };
      
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        }
    });

    res.status(200).send("Forgot Password link sent! Please check your mail")
}


const resetPassword = async (req, res) => {

    if(!req.body || !req.body.newPassword || !req.body.newPasswordConfirm || !req.body.email) {
        return res.status(400).send("Please enter email, newPassword, and newPasswordConfirm fields")
    }

    if(req.body.newPassword.localeCompare(req.body.newPasswordConfirm)) {
        return res.status(400).send("newPassword and newPasswordConfirm fields must match!")
    }

    const newHashedPassword = await bcrypt.hash(req.body.newPassword, 10)
    // console.log("naya",newHashedPassword)
    const currentUser = await User.findOne({email: req.body.email})
    // console.log(currentUser)    
    currentUser.password = newHashedPassword;
    currentUser.save()
    res.status(200).send("Password has been reset! You may now log in with new password")
}


const checkIn = async (req, res) => {

    //first things first - you must be logged in
    if(!req.headers.authorization) {
        return res.status(401).send("Log in and try again")
    }

    //we don't ask for username - simply obtain that through ID in JWT

    const receivedToken = req.headers.authorization.split(" ")[1]
    
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, (err, userData) => {

        if(err) {
            console.error("Error in JWT verification:", err)
            return res.status(403).send(err)
        }

        req.userData = userData
    })

    console.log("bahar se:", req.userData)

    const today = new Date((new Date().getFullYear()), (new Date().getMonth()), (new Date().getDate()))
    const currentUser = await findByIdTimeLogs(req.userData._id, today)
    console.log(currentUser)
    
    //is this the first check in of the day? if yes, then create a new document
    if(currentUser == undefined) {
        const timeLogForToday = await TimeLogs.create({
            user: req.userData._id,
            date: today,
            checkIn: [new Date()],
            checkOut: [],
            workHour: 0
        })
        timeLogForToday.save()
    }
    else {
        //this is not the first check in of the day. in that case, simply append to checkin array
        console.log("Inside else")

        //if we're already checked in without checking out -- dont allow more check ins
        if(currentUser.checkIn.length == currentUser.checkOut.length + 1) {
            return res.status(400).send("Can't re-checkin!")
        }

        currentUser.checkIn.push(new Date())
        currentUser.save()
    }

    res.status(200).send("Checked in successfully!")
}


const checkOut = async (req, res) => {

    if(!req.headers.authorization) {
        return res.status(401).send("Log in  and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]

    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, (err, userData) => {
        if(err) {
            console.error("Error in JWT verification", err)
            return res.status(403).send(err)
        }

        req.userData = userData
    })

    const today = new Date((new Date().getFullYear()), (new Date().getMonth()), (new Date().getDate()))
    const currentUser = await findByIdTimeLogs(req.userData._id, today)
    console.log(currentUser)

    console.log("kya scene h")
    if(currentUser == undefined) { //means not even a single check in for today has happened
        console.log("undefinied aaya")
        return res.status(405).send("Cannot check out if you've never checked in. Check in and try again")
    }

    if(currentUser.checkIn.length == currentUser.checkOut.length) {
        console.log("already checked in h")
        return res.status(405).send("Check in and try again")
    }

    if(currentUser.checkIn.length-1 == currentUser.checkOut.length) { //only then allowed
        console.log("allowed hona chahiye")
        currentUser.checkOut.push(new Date())
        // console.log(currentUser.checkOut[currentUser.checkOut.length-1] - currentUser.checkIn[currentUser.checkIn.length-1])
        console.log(currentUser)
        // timestampToHMS(currentUser.checkOut[currentUser.checkOut.length-1] - currentUser.checkIn[currentUser.checkIn.length-1])
        
        const shiftDuration = (currentUser.checkOut[currentUser.checkOut.length-1] - currentUser.checkIn[currentUser.checkIn.length-1])/(1000*3600)
        console.log("shift duration:", shiftDuration)
        currentUser.workHour = currentUser.workHour + shiftDuration
        currentUser.save()
        res.status(200).send("Checked out successfully")    
    }

}


const logIn = async (req, res) => {

    if(!req.body || !req.body.username || !req.body.password) {
        return res.status(400).send("Please send username and password!")
    }

    const currentUser = await User.findOne({username: req.body.username})
    if(currentUser == null) {
        return res.status(403).send("No such username found. Please contact your admin")
    }

    console.log(currentUser)
    const passwordMatch = await bcrypt.compare(req.body.password, currentUser.password)
    if(passwordMatch == false) {
        return res.status(403).send("Incorrect password entered")
    }

    let userData = {
        "_id": currentUser._id,
        "role": currentUser.role 
    }

    const currentSessionJWT = jwt.sign(userData, process.env.JWT_SECRET_KEY)
    currentUser.token = currentSessionJWT
    currentUser.save()
    res.status(200).send("Log in successful!")
}



const logOut = async (req, res) => {

    //first things first - do i have a JWT?
    if(!req.headers.authorization) {
        return res.status(401).send("Log in and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT error")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, (err, userData) => {
        
        if(err) {
            return res.status(403).send(err)
        }

        req.userData = userData
    })

    //check if our this "valid" JWT actually exists in table RN
    const currentUser = await findByIdUser(req.userData._id)
    console.log(currentUser)
    if(currentUser.token == ''){
        return res.status(401).send("Log in and try again")
    }
    currentUser.token = ''
    currentUser.save()
    res.status(200).send("Logged out successfully")

    
}





module.exports = {
    // setProfilePic,
    getAll,
    changePassword,
    forgotPassword,
    resetPassword,
    checkIn,
    checkOut,
    logIn,
    logOut
}