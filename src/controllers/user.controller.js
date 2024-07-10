import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { wrapper } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt, { decode } from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId)
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })//this ensures the  validation checks do not occur for all values present in user model schema that are "required" since we are only providing a sigle value here
  return { accessToken, refreshToken }
}

const registerUser = wrapper(async function (req, res) {

  const { userName, password, email, fullName } = req.body

  if ([userName, password, email, fullName].some((field) => field?.trim() === "" || field === undefined)) {
    throw new apiError(400, "All fields are required to be filled")
  }
  if (!email.includes("@")) {
    throw new apiError(400, "Invalid Email")
  }

  const userExist = await User.findOne({
    email: email
  })
  if (userExist) {
    throw new apiError(409, "This email is already registered")
  }
  const userNameTaken = await User.findOne({
    userName: userName
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
    throw new apiError(400, "Avatar image is required")
  }

  const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath)
  const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath)


  if (!avatarCloudinary) {
    throw new apiError(400, "avatar file is required")
  }

  const user = await User.create({
    userName: userName.toLowerCase(),
    password,
    email,
    fullName,
    avatar: avatarCloudinary.url,
    coverImage: coverImageCloudinary?.url || ""//since we never checked whether user gave coverImage or not since it isnt "required",here we use "?." to check 
  })

  const userCreated = await User.findById(user._id).select(//here we could have directly done user.select() but doing  User.findById(user._id) instead alllows us to ensure that the user object has been  created in the database otherwise user._id would return null/undefined

    "-password -refreshToken"
    //the values we provide to select() are removed from the User object ,here password and refresh token are removed from the returned object
  )

  if (!userCreated) {
    throw new apiError("something went wrong at the server")
  }

  return res.status(201).json(//its isnt necessary to explicitly give res.status when u already provide it in the object below but its good practice since postman expects a response in this manner
    new apiResponse(200, userCreated, "User registered successfully")
  )

})

const loginUser = wrapper(async (req, res) => {

  const { userName, email, password } = req.body

  if (!(userName || email)) {
    throw new apiError(400, "You must provide either of username or email")
  }

  const userData = await User.findOne({
    $or: [{ userName }, { email }]
  })
  if (!userData) {
    throw new apiError(404, "User account not found! Please register yourself")
  }

  const isPasswordValid = userData.checkPassword(password)
  if (!isPasswordValid) {
    throw new apiError(401, "Invalid password")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(userData._id)

  const loggedInUser = await User.findOne(userData._id).select("-password -refreshToken")//since the userData here refer to older version as the userdata was created before we provided refreshToken value,now that we have already updated the refreshToken value of userData in above method,so we need to access the updated value from database or we could have just update the value here instead i.e userData.refreshToken=refreshToken

  //send cookies-->
  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully"
      )
    )

})

const logoutUser = wrapper(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1//here whatever value is flagged with one ,it is  removed from database by unset
      }
    },
    {
      new: true//this is necessary to ensure that the new updated value of user model's instance is returned
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }
  return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = wrapper(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorised request")
  }

  try {//its good practice to wrap decoding code in try-catch since its error prone
    const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedRefreshToken?._id)
    if (!user) {
      throw new apiError(401, "invalid refresh token")
    }
  
    if (incomingRefreshToken !== user.refreshToken) {
      throw new apiError("Refresh token is expired or used")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)//used newRefreshToken rather then refreshToken since here we are creating a new refresh token which should not be consfused with older value because of same name
    const options = {
      httpOnly: true,
      secure: true
    }
    
    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken },
          "Access tokens refreshed "
        )
      )
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Refresh Token")
  }
})

const changePassword = wrapper(async (req, res) => {
  
  const { oldPassword, newPassword, confirmPassword } = req.body
  if (newPassword !== confirmPassword) {
    throw new apiError(401, "password confirmation failed")
  }
  const user = await User.findById(req.user._id)
  const isPasswordCorrect = await user.checkPassword(oldPassword)
  if (!isPasswordCorrect) {
    throw new apiError(401, "Incorrect old password")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  return res.status(200)
    .json(
      new apiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = wrapper(async (req, res) => {
  return res.status(200).json(
    new apiResponse(200, req?.user, "User data fetched successfully")
  )
})

const updateUserData = wrapper(async (req, res) => {
  const { fullName, email } = req.body
  if (!(fullName && email)) {
    throw new apiError(400, "All fields are required")
  }
  const user = await User.findByIdAndUpdate(req.user._id,
    {
      $set: {
        fullName,
        email
      }
    },
    {
      new: true//ensures that updated user is returned and saved in the database collection
    }
  ).select("-password -refreshToken")

  return res.status(200).json(
    new apiResponse(200, user, "Account details updated successfully")
  )
})

const updateAvatar = wrapper(async (req, res) => {
  const avatarUrl = req.file?.path//since multer here only intakes a single file..we use file instead of files
  if (!avatarUrl) {
    throw new apiError(400, "Avatar file is missing")
  }
  const avatarClodinary = await uploadOnCloudinary(avatarUrl)

  if (!avatarClodinary.url) {
    throw new apiError(400, "Error while uploading avatar file on cloudinary")
  }
  let user = await User.findById(req.user._id)

  let currentAvatarPublicId = user.avatar.substring(user.avatar.lastIndexOf("/") + 1)
  currentAvatarPublicId = currentAvatarPublicId.substring(0, currentAvatarPublicId.lastIndexOf("."))

  const response = await cloudinary.uploader.destroy(currentAvatarPublicId, {
    resource_type: "image"//Must be one of: image, javascript, css, video, raw
  })

  if (response.result === "ok") {//.destroy returns an object with result:"ok" or  result:"error..."
    console.log("old avatar image successfully deleted from cloudinary")
  }

  user = await User.findByIdAndUpdate(user._id, {
    $set: {
      avatar: avatarClodinary.url
    }
  },
    {
    new: true
  }).select("-password -refreshToken"); // Select fields after update


  return res.status(200).json(
    new apiResponse(200, user, "User avatar changed successfully")
  )
})

const updateCoverImage = wrapper(async (req, res) => {
  const coverImageUrl = req.file?.path//since multer here only intakes a single file..we use file instead of files
  if (!coverImageUrl) {
    throw new apiError(400, "Cover Image file is missing")
  }
  const coverImageCloudinary = await uploadOnCloudinary(coverImageUrl)

  if (!coverImageCloudinary.url) {
    throw new apiError(400, "Error while uploading Cover Image file on cloudinary")
  }
  let user = await User.findById(req.user._id)

  let currentCoverImagePublicId = user.coverImage.substring(user.coverImage.lastIndexOf("/") + 1)
  currentCoverImagePublicId = currentCoverImagePublicId.substring(0, currentCoverImagePublicId.lastIndexOf("."))
  
  const response = await cloudinary.uploader.destroy(currentCoverImagePublicId, {
    resource_type: "image"
  })
  if (response.result == "ok") {
    console.log("old  cover-image successfully deleted from cloudinary")
  }
  
  user = await User.findByIdAndUpdate(user._id, {
    $set: {
      coverImage: coverImageCloudinary.url
    }
  },
    {
    new: true
  }).select("-password -refreshToken");

  return res.status(200).json(
    new apiResponse(200, user, "User Cover-Image changed successfully")
  )
})

const getUserChannelInfo = wrapper(async (req, res) => {
  const { userName } = req.params
  if (!userName?.trim()) {
    throw new apiError(400, "username is missing")
  }
  const channelInfo = await User.aggregate(
    [
      {
        $match: { userName: userName }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields: {
          subscriberCount: {
            $size: "$subscribers"
          },
          subscribedToCount: {
            $size: "$subscribedTo"
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false
            }
          }
        }
      },//by now we have an object containing the user model instance info for "username" provided in url,an array ofobjects provided by first lookup and an array of objectsproovided by second lookup

      // in order to decide which value should be provided for channel profile we user-->
      {
        $project: {
          fullName: 1,
          userName: 1,
          email: 1,
          avatar: 1,
          coverImage: 1,
          subscriberCount: 1,
          subscribedToCount: 1,
          isSubscribed: 1,
          createdAt: 1
        }
      }
    ])
  if (!channelInfo?.length) {
    throw new apiError(401, "channel doesn't exist")
  }

  return res.status(200).json(
    new apiResponse(200, channelInfo[0], "channel information successfully retrieved")
  )
})

const getWatchHistory = wrapper(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res.status(200).json(
    new apiResponse(200, user[0].watchHistory, "User watch history fetched successfully ")
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAvatar,
  updateUserData,
  updateCoverImage,
  getUserChannelInfo,
  getWatchHistory
}