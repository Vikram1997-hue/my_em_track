const express = require('express')
require('dotenv').config()
const app = express()
const userRouter = require('./routes/userRoute')

app.use(express.json())
app.use("/user", userRouter)

app.get("/", (req, res) => {

    res.send("we here")
})


app.listen(process.env.DEFAULT_PORT || 3000, (err) => {
    if(err) 
        console.error("Error in server connection attempt:", err)
})