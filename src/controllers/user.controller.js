import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { application } from "express";

const generateAccessTokenAndRefreshToken = async (userid) => {
    try {
        const user = await User.findById(userid);   
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave : false });    

        return { accessToken , refreshToken };

    } catch (error) {
        throw new ApiError(501 , `Something went wrong while generating refresh token and access token ${error.message}`);
    }
}

const registerController = asyncHandler(async (req , res) => {
   const {fullName , username , email , password} = req.body;
   console.log(fullName , username , email , password);

    if ([fullName , username , email , password].some((fields => fields?.trim() === "" ))){
        throw new ApiError(400 , "All fields are required");
    }

    const existingUser = await User.findOne({
        $or : [{ username } , { email }]
    })

    if( existingUser ){
        throw new ApiError(409 , "User already exists");    
    }
    // console.log(req.files);
    let avatarLocalPath ;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400 , "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

   return res.status(201).json(
    new ApiResponse(200 , createdUser , "User registered Successfully")
   )
})

const loginController = asyncHandler(async (req , res) => {
    // console.log(req);
    const { username , email , password } = req.body;

    if(!username && !email){
        throw new ApiError(400 , "username or email required")
    }

    const user = await User.findOne({
        $or : [{username} , {email}]
    });

    if(!user){
        throw new ApiError(400 , "User dosen't exist");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid user credentials");
    }

    const { accessToken , refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const option = { //frontend will not be able to change the cookies
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , option)
    .cookie("refreshToken" , refreshToken , option)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser , accessToken , refreshToken
            },
            "User logged in successfully"
        )
    );
})

const logoutController = asyncHandler(async (req , res) => {
    console.log("User from req:", req.user);
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : null
            }
        },
        {
            new : true
        }
    )
    console.log(user);
    const option = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken" , option)
    .clearCookie("refreshToken" , option)
    .json(
        new ApiResponse(200 , {} , "User logged Out")
    )
})

const refreshAccessToken = asyncHandler(async (req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401 , "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken ,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401 , "Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh Token is expired or used");
        }
    
        const option = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , newRefreshToken} = generateAccessTokenAndRefreshToken(user?._id);
    
        return res
        .status(201)
        .cookie("accessToken" , accessToken , option)
        .cookie("refreshToken" , newRefreshToken , option)
        .json(
            new ApiResponse(201 , {accessToken , refreshToken} , "Access Token refreshed")
        )
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid refresh token")
    }

})

export {
    registerController,
    loginController,
    logoutController,
    refreshAccessToken
}