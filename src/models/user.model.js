import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

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

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(//jwt.sign is synchronous and doesnt return any promises so await wont have any effect on it; jwt.sign intakes 3 values-->
    {//payload-->
    _id: this._id,
    email: this.email,
    userName: this.userName,
    fullName:this.fullName
    },//"token secret" key-->
    process.env.ACCESS_TOKEN_SECRET,
    {//"Access token expiry-->"
      expiresIn: ACCESS_TOKEN_EXPIRY
    }
  )
}
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
    _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User=mongoose.model("User",userSchema)