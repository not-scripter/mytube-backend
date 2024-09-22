import dotenv from "dotenv";
import connectDb from "./db/index.js";
import app from "./app.js";

dotenv.config({
  path: "./env",
});

connectDb()
  .then(() => {
    const port = process.env.PORT || 8001;
    app.listen(port, () => {
      console.log("db connected successfully to port : ", port);
    });
  })
  .catch((err) => {
    console.log("db connection failiure : ", err);
  });

//NOTE: First approach
//
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// import express from "express";
// const app = express();
//
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log(error);
//       throw error;
//     });
//     app.listen(process.env.PORT, () => {
//       console.log(`Listening on ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.log(error);
//     throw error;
//   }
// })();
