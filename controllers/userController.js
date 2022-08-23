const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

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


const changePassword = async (req,res) => {

    //as always, I expect that we are already logged in
    if(!req.headers.authorization) {
        res.status(403).send("Log in and try again")
    }

    if(!req.body || !req.body.oldPassword || !req.body.newPassword || !req.body.newPasswordConfirm) {
        res.status(400).send("oldPassword, newPassword, and newPasswordConfirm all must be passed")
    }

    if(req.body.newPassword != req.body.newPasswordConfirm) {
        res.status(400).send("newPassword and newPasswordConfirm must match!")
    }


    const receivedToken = req.headers.authorization.split(" ")[1]
    
    //obtain our guy from JWT
    jwt.verify(receivedToken, process.env.JWT_SECRET_KEY, async (err, userData) => {
        if(err) {
            console.error("Error in JWT verification", err)
            return res.status(403)
        }


        //if we are here, it's definitely our guy
        req.userData = userData;
    })


    console.log("userdata:", req.userData._id)

    const currentUser = await findById(req.userData._id)
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





    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'vikramaditya@appventurez.com',
          pass: 'longlivesatan'
        }
      });
      
      let mailOptions = {
        from: 'vikramaditya@appventurez.com',
        to: req.body.email,
        subject: 'RESET PASSWORD LINK',
        text: 'Click on this link to reset your password'
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        }
      });
}



module.exports = {
    // setProfilePic,
    getAll,
    changePassword,
    forgotPassword
}