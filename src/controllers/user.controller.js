import { wrapper } from "../utils/asyncHandler.js";

const registerUser = wrapper(async function (req,res) {
  res.status(200).json({
    message:"ok"
  })
})
export {registerUser}