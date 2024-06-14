import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { wrapper } from "../utils/asyncHandler.js";

const registerUser = wrapper(async function (req,res) {

  const { username, password, email, fullName } = req.body
  console.log("Username: ",username)
  console.log("password: ",password)
  console.log("email: ",email)
  console.log("fullName: ", fullName)
  
  if ([username, password, email, fullName].some((field) => field?.trim()==="")) {
    throw new apiError(400,"All fields are required to be filled")
  }
  if (!email.includes("@")) {
    throw new apiError(400,"Invalid Email")
  }

  const userExist = User.findOne({
    email:email
  })
  if (userExist) {
    throw new apiError(409,"This email is already registered")
  }
  const userNameTaken = User.findOne({
    username:username
  })
  if (userNameTaken) {
    throw new apiError(409, "This Username is already taken")
  }

})
export {registerUser}