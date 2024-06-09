import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (uploadFileUrl) => {
  try {
    if (!uploadFileUrl) return null
    
    const response= await cloudinary.uploader.upload(uploadFileUrl, {
      resource_type: 'auto'
    })
    console.log("File has been successfully uploaded on Cloudinary! Access it on: ", response.url)

    return response//we can access the url of the saved video from response.url

  } catch {
    fs.unlinkSync(uploadFileUrl)
    return null
  }

}

export {uploadOnCloudinary}