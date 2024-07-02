import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { wrapper } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId)
  const accessToken = user.generateAccessToken
  const refreshToken = user.generateRefreshToken

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })//this ensures the  validation checks do not occur for all values present in user model schema that are "required" since we are only providing a sigle value here
  return {accessToken,refreshToken}
}

const registerUser = wrapper(async function (req, res) {

  const { userName, password, email, fullName } =  req.body

  if ([userName, password, email, fullName].some((field) => field?.trim() === "" ||field===undefined)) {
    throw new apiError(400, "All fields are required to be filled")
  }
  if (!email.includes("@")) {
    throw new apiError(400, "Invalid Email")
  }

  const userExist = await User.findOne({
    email:  email
  })
  if (userExist) {
    throw new apiError(409,"This email is already registered")
  }
  const userNameTaken =await User.findOne({
    userName:userName
  })
  if (userNameTaken) {
    throw new apiError(409, "This Username is already taken")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path//avatar is an array of objects ,each object representing the file uploaded from the same "avatar" field,here only one file is uploaded so array only has one object representing that file

  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
     coverImageLocalPath = req.files?.coverImage[0]?.path
  }
  
  if (!avatarLocalPath) {
    throw new apiError(400,"Avatar image is required")
  }

  const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath)
  const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath) 

  
  if (!avatarCloudinary) {
    throw new apiError(400,"avatar file is required")
  }

  const user=await User.create({
    userName:userName.toLowerCase(),
    password,
    email,
    fullName,
    avatar: avatarCloudinary.url,
    coverImage:coverImageCloudinary?.url || ""//since we never checked whether user gave coverImage or not since it isnt "required",here we use "?." to check 
  })

  const userCreated = await User.findById(user._id).select(//here we could have directly done user.select() but doing  User.findById(user._id) instead alllows us to ensure that the user object has been  created in the database otherwise user._id would return null/undefined

    "-password -refreshToken"
    //the values we provide to select() are removed from the User object ,here password and refresh token are removed from the returned object
  )

  if (!userCreated) {
    throw new apiError("something went wrong at the server")
  }

  return res.status(201).json(//its isnt necessary to explicitly give res.status when u already provide it in the object below but its good practice since postman expects a response in this manner
    new apiResponse(200,userCreated,"User registered successfully")
  )

})

const loginUser = wrapper(async (req, res) => {
  
  const { userName, email, password } = req.body
  if (!userName && !email) {
    throw new apiError(400, "You must provide either of username or email")
  }

  const userData = await User.findOne({
    $or:[{userName},{email}]
  })
  if (!userData) {
    throw new apiError(404,"User account not found! Please register yourself")
  }

  const isPasswordValid = userData.checkPassword(password)
  if (!isPasswordValid) {
    throw new apiError(401,"Invalid password")
  }

  const { accessToken, refreshToken } = generateAccessAndRefreshToken(userData._id)
  
  const loggedInUser = await User.findOne(userData._id).select("-password -refreshToken")//since the userData here refer to older version as the userdata was created before we provided refreshToken value,now that we have already updated the refreshToken value of userData in above method,so we need to access the updated value from database or we could have just update the value here instead i.e userData.refreshToken=refreshToken
  
  //send cookies-->
  const options = {
    httpOnly: true,
    secure:true
  }

  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user:loggedInUser,accessToken,refreshToken
        },
        "User logged in successfully"
      )
    )

})
export { registerUser }