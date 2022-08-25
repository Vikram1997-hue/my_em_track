const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

require('dotenv').config()
const conn = require("../config/db.config")
const User = require("../models/user")
const TimeLogs = require("../models/timeLogs")


setInterval(async () => {

    let pastClosing = false
    let now = new Date()
    const nonCheckedOutUser = await TimeLogs.findOne({$where: "this.checkIn.length > this.checkOut.length"})
    // nonCheckedOutUser.date
    if(nonCheckedOutUser == null)
        console.log("everyone is checked out")
    else if(nonCheckedOutUser.date.getFullYear() == now.getFullYear() && nonCheckedOutUser.date.getMonth() == now.getMonth() && nonCheckedOutUser.date.getDate() == now.getDate()) {
        if((now.getHours() > process.env.TIMEOUT_HRS) || (now.getHours() == process.env.TIMEOUT_HRS && now.getMinutes() >= process.env.TIMEOUT_MINS))
            pastClosing = true    
    }
    else {
        //if we are here, then we never entered the else if. That means it's not same date
        pastClosing = true
    }


    if(pastClosing) {

        while(1) {

            const currentUser = await TimeLogs.findOne({$where: "this.checkIn.length > this.checkOut.length"})
            if(currentUser == null)
                break
            
            console.log("\n\nabhi ispe operation:", currentUser)
            let autoCheckOutTime = new Date(currentUser.date.getFullYear(), currentUser.date.getMonth(), currentUser.date.getDate(), process.env.TIMEOUT_HRS, process.env.TIMEOUT_MINS)
            // console.log(currentUser.checkIn[currentUser.checkIn.length-1], autoCheckOutTime)
            console.log("YOU ARE GETTING THROWN OUT AT", autoCheckOutTime)
            
            currentUser.checkOut.push(autoCheckOutTime)
            console.log("pushed value", currentUser.checkOut[currentUser.checkOut.length-1])
            currentUser.workHour = currentUser.workHour + ((autoCheckOutTime - currentUser.checkIn[currentUser.checkIn.length-1]) / (1000 * 3600) )
            await currentUser.save()
        }
    }
    else
        console.log("abhi h time auto check out mein")

}, 1000*3600*24) 




async function findByIdUser(id) {
    
    const currentUser = await User.findById(id)
    return currentUser
}

async function findByIdTimeLogs(userId, today) {
    const doc = await TimeLogs.findOne({user: userId, date: today})
    return doc
}


const getAll = (req, res) => {     //FOR THIS TO WORK - SEND JWT IN AUTHORIZATION HEADER
    
    //at this point, it is assumed that our guy is signed in
    if(!req.headers.authorization) { 
        return res.status(401).send("Log in and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]
    if(receivedToken == null) {
        console.log("entered token null error")
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {

        if(err) {
            console.error("Error in JWT verification:", err)
            return res.status(403).send(err)
        }

        
        //now we have a valid JWT. But is this a JWT that exists in the DB currently?
        let currentUser = await findByIdUser(userData._id)
        if(currentUser.loginToken.localeCompare(receivedToken) != 0) {
            return res.status(403).send("No user found with this JWT")
        }

        const ans = {
            name: currentUser.name,
            email: currentUser.email,
            employeeId: currentUser.employeeId,
            profilePic: currentUser.profilePic
        }
    
        res.status(200).send(ans)
    })
    
    // const currentUser = await findByIdUser(req.userData._id)

    
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
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }


    //obtain our guy from JWT
    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {
        if(err) {
            console.error("Error in JWT verification", err)
            return res.status(403).send(err)
        }


        //now we have a valid JWT. But is this a JWT that exists in the DB currently?
        currentUser = await findByIdUser(userData._id)
        if(currentUser.loginToken.localeCompare(receivedToken) != 0) {
            return res.status(403).send("No user found with this JWT")
        }

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
    })   
}



const forgotPassword = async (req, res) => {

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

    const currentUser = await User.findOne({email: req.body.email})
    const userData = {
        _id: currentUser._id,
        role: currentUser.role
    }
    const myResetToken = jwt.sign(userData, process.env.JWT_SECRET_KEY, {
        expiresIn: '7200000' //2 hours
    })
    currentUser.resetToken = myResetToken;
    currentUser.manager = null;
    currentUser.save()


    res.status(200).send("Forgot Password link sent! Please check your mail")
}


const resetPassword = async (req, res) => {

    //should contain the JWT for expiration time
    if(!req.headers.authorization) {
        return res.status(401).send("Please send JWT")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, (err, userData) => {
        if(err) {
            console.log("Error in JWT verification", err)
            return res.status(403).send(err)
        }

    })


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
    res.status(200).end("Password has been reset! You may now log in with new password")
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

    try {
        jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, (err, userData) => {
            if(err) {
                console.error("Error in JWT verification", err)
                return res.status(403).send(err)
            }

            req.userData = userData
        })
    }
    catch(error) {
        console.error(error)
    }
    
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
    currentUser.loginToken = currentSessionJWT
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
    if(currentUser.loginToken == ''){
        return res.status(401).send("Log in and try again")
    }
    currentUser.loginToken = ''
    currentUser.save()
    res.status(200).send("Logged out successfully")
}


const getUserTimeLogs = (req, res) => { //attempting polymorphism for user and subadmin

    //is he logged in?
    if(!req.headers.authorization) {
        return res.status(401).send("Log in and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }


    //THIS PROGRAM ASSUMES THAT 2 STRINGS (START_DATE AND END_DATE) ARE PASSED AS QUERY PARAMS
    if(!req.query.start_date || !req.query.end_date) {
        return res.status(400).send("start_date and end_date are needed")
    }


    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {
        if(err) {
            console.error("Error in JWT verification:", err)
            return res.status(403).send(err)
        }

        //now we have a valid JWT. But is this a JWT that exists in the DB currently?
        const currentUser = await findByIdUser(userData._id)
        if(currentUser.loginToken.localeCompare(receivedToken) != 0) {
            return res.status(403).send("No user found with this JWT")
        }
        

        //if we are still here, everything is in order
        console.log(currentUser)
        const start_date = new Date(req.query.start_date)
        const end_date = new Date(req.query.end_date)
        
        
        //date validation
        if(start_date > end_date) {
            return res.status(400).send("start_date must be less than end_date")
        }

        let now = new Date()
        if(start_date < new Date(now.setMonth(now.getMonth() - 6))) {
            return res.status(400).send("Neither date can be older than 6 months")
        }



        let requiredData;

        //ADDING IN POLYMORPHISM
        console.log("USER ROLE:", currentUser.role)
        if(currentUser.role == 'user') {
            requiredData = await TimeLogs.find({date: {$gte: start_date, $lte: end_date}, user: userData._id})
        }
        else if(currentUser.role == 'subAdmin') {
            // requiredData = await TimeLogs.find //LEARN LOOKUP
            if(!req.body.subordinateId) {
                return res.status(400).send("subordinateId is missing")
            }

            //first let's check if this employee is one of our guy's subordinates
            const subordinate = await findByIdUser(req.body.subordinateId)
            if(JSON.stringify(subordinate.manager) != JSON.stringify(currentUser._id)) {
                return res.status(403).send("This employee is not managed by you!")
            }
            requiredData = await TimeLogs.find({date: {$gte: start_date, $lte: end_date}, user: req.body.subordinateId})

        }


        // console.log("printing hits", requiredData)
        
        res.status(200).send(requiredData)
    })
}


const viewSingleAssignedEmployees = (req, res) => {
    
    if(!req.headers.authorization) {
        return res.status(401).send("Log in and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {
        if(err) {
            console.error("Error in JWT verification:", err)
            return res.status(403).send(err)
        }

        //valid JWT. but is it in DB?
        const currentUser = await findByIdUser(userData._id)
        if(currentUser.loginToken.localeCompare(receivedToken) != 0) {
            return res.status(403).send("No sub-admin found with this JWT!")
        }

        if(currentUser.role.localeCompare("subAdmin") != 0) 
            return res.status(403).send("YOU ARE NOT A SUBADMIN. You do not have the necessary permissions for this action.")

        
        //all is well. finally doing the data retrieval --
        const results = await User.find({manager: currentUser._id})
        res.status(200).send(results)
    })
}



const employeeCountByDay = async (req, res) => {

    if(!req.headers.authorization) {
        return res.status(401).send("Please log in and try again")
    }

    const receivedToken = req.headers.authorization.split(" ")[1]
    if(receivedToken == null) {
        return res.status(401).send("Invalid JWT")
    }

    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {
        if(err) {
            console.error("Error in JWT verification:", err)
            res.status(403).send(err)
        }

        //we now have a valid JWT. But is it the correct one?
        let currentUser = await findByIdUser(userData._id)
        console.log(currentUser)
        if(currentUser.loginToken.localeCompare(receivedToken)) {
            res.status(403).send("No sub-admin found with this JWT!")
        }

        if(currentUser.role.localeCompare("subAdmin")) {
            res.status(403).send("YOU ARE NOT A SUBADMIN. You do not have the permissions necessary for this action.")
        }

        const requiredData = await User.find({manager: currentUser._id})
        console.log("AND HIS SUBBIES ARE",requiredData)


        
    })
    
    
}


module.exports = {
    getAll,
    changePassword,
    forgotPassword,
    resetPassword,
    checkIn,
    checkOut,
    logIn,
    logOut,
    // logsForDashboard,
    getUserTimeLogs,
    viewSingleAssignedEmployees,
    employeeCountByDay
}