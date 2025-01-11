import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

//TODO: create tweet
const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if (!tweet) {
        throw new ApiError(500, "something went wrong while creating tweet please try again")
    }

    return res
    .status(201)
    .json(new ApiResponse(201, tweet, "tweet created successfully"))
});

// TODO: get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerdetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likedetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likedetails"
                },
                ownersDetails: {
                    $first: "$ownerdetails"
                },
                idLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likedetails.likedBy"]},
                    then: true,
                    else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            }

        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, tweets, "tweets fetched successfully"))
});

//TODO: update tweet
const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const {content} = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "tweet not found")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweet?._id,
        {
            $set: {
                content,
            },
        },
        {new: true}
    )

    if (!updatedTweet) {
        throw new ApiError(500, "something went wrong while updating tweet please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "tweet updated successfully"))
});

//TODO: delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "tweet not found")
    }

    if (req.user?._id.toString() !== tweet?.owner.toString()) {
        throw new ApiError(401, "You are not authorized to delete this tweet")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(
        tweet?._id
    )

    if (!deletedTweet) {
        throw new ApiError(500, "something went wrong while deleting tweet please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "tweet deleted successfully"))
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}