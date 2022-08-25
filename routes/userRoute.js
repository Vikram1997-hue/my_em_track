const express = require('express')
const router = express.Router()

const userController = require("../controllers/userController")




// router.put("/setProfilePic", userController.setProfilePic)

router.get("/getAll", userController.getAll)

router.put("/changePassword", userController.changePassword)

router.put("/forgotPassword", userController.forgotPassword)

router.put("/resetPassword", userController.resetPassword)

router.put("/checkIn", userController.checkIn)

router.put("/checkOut", userController.checkOut)

router.put("/login", userController.logIn)

router.put("/logout", userController.logOut)

router.get("/getUserTimeLogs", userController.getUserTimeLogs)

router.get("/viewAssignedEmployees", userController.viewAssignedEmployees)



module.exports = router;