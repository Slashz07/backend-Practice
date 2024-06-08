import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt"
import { JsonWebTokenError } from "jsonwebtoken";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
      trim: true,
      index:true
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index:true
    },
    avatar: {
      type: String,
      required:true
    },
    coverImage: {
      type: String
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref:"Videos"
      }
    ],
    password: {
      type: String,
      required: [true, "please provide a passwrod"],
    },
    refershToken: {
      type:String
    }
  },
  {
    timestamps:true
  }
)

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

export const User=mongoose.model("User",userSchema)