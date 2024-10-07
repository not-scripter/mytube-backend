import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const secureCookieOptions = {
  httpOnly: true,
  secure: true,
};

const generateAuthTokens = async (userID) => {
  try {
    const user = await User.findOne(userID);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      400,
      "something went wrong, while generating auth tokens",
    );
  }
};

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

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with email or username allready exists");
  }

  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0].path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong when creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body => ddata
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is reuired");
  }

  const user = await User.findOne({
    $or: [username, email],
  });

  if (!user) {
    throw new ApiError(404, "user does not exists");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(404, "password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAuthTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  return res
    .status(400)
    .cookie("accessToken", accessToken, secureCookieOptions)
    .cookie("refreshToken", refreshToken, secureCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true },
  );

  return res
    .status(200)
    .clearCookie("accessToken", secureCookieOptions)
    .clearCookie("refreshToken", secureCookieOptions)
    .json(new ApiResponse(200, {}, "user logged out sucessfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefredhToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefredhToken) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefredhToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefredhToken !== user?.refreshToken) {
      throw new ApiError(401, "invalid refresh token");
    }

    const { accessToken, refreshToken } = await generateAuthTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, secureCookieOptions)
      .cookie("refreshToken", refreshToken, secureCookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "error refreshing access token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: res.user }, "user fetched successfully"),
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.ussr._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "forgot password successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { username, fullname, email } = req.body;

  if (!(username || fullname || email)) {
    throw new ApiError(401, "account details is required");
  }

  const user = await User.findByIdAndUpdate(
    res.user._id,
    {
      $set: {
        username,
        fullname,
        email,
      },
    },
    { new: true },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "user details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, rea) => {
  const localAvatarPath = req.files[0]?.path;

  const uploadedFile = await uploadOnCloudinary(localAvatarPath);

  if (!uploadedFile.url) {
    throw new ApiError(401, "error uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    res.user._id,
    {
      $set: {
        avatar: uploadedFile.url,
      },
    },
    { new: true },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "updated user avatar successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, rea) => {
  const localCoverImagePath = req.files[0]?.path;

  const uploadedFile = await uploadOnCloudinary(localCoverImagePath);

  if (!uploadedFile.url) {
    throw new ApiError(401, "error uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    res.user._id,
    {
      $set: {
        coverImage: uploadedFile.url,
      },
    },
    { new: true },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user }, "updated user cover image successfully"),
    );
});

const getUserChannelDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim) {
    throw new ApiError(400, "username not found");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCoune: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullname: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribers: 1,
        subscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);
  // console.log(channel);

  if (!channel?.length) {
    throw new ApiError(401, "channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel, "channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await Uswr.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, user[0].watchHistory),
      "watch history fetched succesfully",
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  forgotPassword,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelDetails,
  getWatchHistory,
};
