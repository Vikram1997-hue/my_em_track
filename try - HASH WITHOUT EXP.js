const jwt = require('jsonwebtoken')
require('dotenv').config()

// const user = 
const ans = jwt.sign(
    {
        _id: "62fe4d40ccd7a0d9c4ee011e", //eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MmZmYmRmNGMzNjhlNTAzZTNkZGViYTQiLCJyb2xlIjoic3VwZXJBZG1pbiIsImlhdCI6MTY2MTE3MjU3Mn0.jjzwkSTpTN6YqCLY_p35yysZbh_4HItCCRMnNDS9PwM
        role: "user",
    },
    process.env.JWT_SECRET_KEY
)

console.log(ans)