import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router=Router()

router.route("/register").post(registerUser) //the functions invoked in .post() or .get() etc recieve parameters req,res,next and err but function that accepts err as parameter is only invoked if error occurs

export default router