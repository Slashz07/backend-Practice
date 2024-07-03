import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { wrapper } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = wrapper(async (req,res,next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
  if (!token) {
    throw new apiError(401,"Invalid request(tokens not found in cookies)")
  }
  console.log(token)
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)//this unwraps the token and the data we provided to it at time of token generation
  const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  if (!user) {
    throw new apiError(401,"Invalid Access token")
  }
  req.user = user
  next()

}) 