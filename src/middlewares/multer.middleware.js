import multer from "multer";

const storage = multer.diskStorage({
  destination:function (req, file, cb) {
    cb(null,"./public/temp")
  },
  filename: function (req, file, cb) {
    const uniqueName=Date.now() + '-' + Math.round(Math.random()* 1E9)
    cb(null,file.fieldname+uniqueName)//fieldname gives the name provided in the name attribute of the  input tag of type="file"
  }
})

export const upload= multer({storage:storage})