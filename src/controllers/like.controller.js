import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

//TODO: toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const likeAlready = await Like.findOne({
        video: videoId,
        owner: req.user._id
    })

    if (likeAlready) {
        await Like.findByIdAndDelete(likeAlready?._id)
        
        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}))
    }

    await Like.create({
        video: videoId,
        owner: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked: true}))
});

//TODO: toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const likeAlready = await Like.findOne({
        comment: commentId,
        owner: req.user._id
    })

    if (likeAlready) {
        await Like.findByIdAndDelete(likeAlready?._id)
        
        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}))
    }

    await Like.create({
        comment: commentId,
        owner: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked: true}))
});

//TODO: toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const likeAlready = await Like.findOne({
        tweet: tweetId,
        owner: req.user?._id
    })

    if (likeAlready) {
        await Like.findByIdAndDelete(likeAlready?._id)
        
        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}))
    }

    await Like.create({
        tweet: tweetId,
        owner: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked: true}))
});

//TODO: get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
    const likeVideosAggregate = await Like.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedvideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerdetails",
                        }
                    },
                    {
                        $unwind: "$ownerdetails"
                    }
                ]
            }
        },
        {
            $unwind: "$likedvideos"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, likeVideosAggregate, "liked videos fetched successfully"))
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}