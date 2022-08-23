const express = require('express')
const router = express.Router()

const userController = require("../controllers/userController")




// router.put("/setProfilePic", userController.setProfilePic)

router.get("/getAll", userController.getAll)

router.put("/changePassword", userController.changePassword)

router.put("/forgotPassword", userController.forgotPassword)


module.exports = router;