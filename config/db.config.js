const mongoose = require('mongoose')
let conn;

try {
    conn = mongoose.connect("mongodb://"+process.env.DB_PATH)
    if(!conn)
        throw new Error("Could not connect to DB")
}
catch(err) {
    console.error("Error in database connection attempt:", err)
}


module.exports = conn