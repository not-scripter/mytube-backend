import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation: not empty
  //check if user already exists : username && email
  //check for images, check for avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in db
  //remove password and refresh token fields from response
  //chevk of user creation
  //return res
  //
  const { username, email, fullname, password } = req.body;

  if (
    [fullname, email, username, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with email or username allready exists");
  }

  const avatarLocalPath = req.files?.avatar[0].path;
  const coverImageLocalPath = req.files?.coverImage[0].path;
});

export { registerUser };
