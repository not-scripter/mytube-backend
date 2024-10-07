import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // console.log("file uploaded to cloudinary", response.url);

    // fs.unlink(localFilePath, (err) => {
    //   if (err) {
    //     console.log("error while deleting local temp file");
    //   } else {
    //     console.log("local file deleted successfully");
    //   }
    // });

    fs.unlinkSync(localFilePath);

    return response;
  } catch (err) {
    console.log(err);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
