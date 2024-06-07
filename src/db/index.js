import mongoose from "mongoose";
import { db_name } from "../constants.js";
// const dbConnect = async () => {
//   try {
//     const connectionHost = await mongoose.connect(`${process.env.mongoDb_URI}/${db_name}`)
//     console.log(`connected to db at host:${connectionHost.connection.host}`)
//   } catch (error) { 
//     console.log("connection to db failed!Error:", error)
//     process.exit(1)
//   }
// }



const dbConnect = () => {

  mongoose.connect(`${process.env.mongoDb_URI}/${db_name}`).then((response) => {
    console.log(`connected to db at host:${response.connection.host}`)
  }).catch((error) => { console.log(`Error: ${error}`) })
}//------------->this is another way of establishing db connection using .then().catch() besides async-await approach
export default dbConnect