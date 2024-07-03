import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router=Router()

router.route("/register").post(
  upload.fields([//we use .single  when we only havw to upload a single file in the entire form
    //and we use .array when multiple files are to be uploaded from a single field in the form
  //.fields intakes an array of multiple objects,each object representing a form field that intakes as many files as the maxCount says.The name provided in the object must be same as thst in form field
    {
      name: "avatar",
      maxCount:1
    },
    {
      name: "coverImage",
      maxCount:1
    }
  ]),
  registerUser) //the functions invoked in .post() or .get() etc recieve parameters req,res,next and err but function that accepts err as parameter is only invoked if error occurs else its ignored ,so carefully choose what parameters will the function invoked will accept

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJwt,
    logoutUser
  )//here both verifyJwt and logoutUser are working on same post request and so the user data added by verifyJwt is accessible to 
export default router