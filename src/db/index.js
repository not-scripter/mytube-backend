import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
  try {
    console.log(process.env.MONGODB_URI);
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB is connected || DB HOST ${connectionInstance.connection.host}`
    );
    console.log(connectionInstance);
  } catch (error) {
    console.log("mongo connection error", error);
    process.exit(1); //NOTE: Learn more
  }
};

export default connectDb;
