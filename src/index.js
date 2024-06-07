import dbConnect from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js";

dotenv.config({
  path:"./env"
})

const port=process.env.PORT||8000

dbConnect().then(() => {
  app.listen(port, () => {//initialising server at a specific port 
    console.log(`the server is now listening on port : ${port}`)
  })
}).catch(() => {
  console.log("Connection to database failed!")
})










// app = express()



// ; (async function () {
//   try {
//     await mongoose.connect(`${process.env.mongoDb_URI}/${db_name}`)
//     app.on("error", (error) => {
//       console.log("Error: ", error)
//       throw error
//     })
//     app.listen(process.env.PORT, () => {
//       console.log(`Server is listening on port:${process.env.PORT} `)
//     })
//   } catch (error) {
//     console.log("Error: ",error)
//   }
// })()