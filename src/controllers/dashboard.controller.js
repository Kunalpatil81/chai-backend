import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?._id

    const totoalSubscribers = await Subscription.aggregate([
        {
            $match: {
                _id: new mongoose.types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                subscribersCount: {
                    $sum: 1
                }
            }
        }
    ]);

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                totoalLikes:{
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totoalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ])

    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
        totalVideos: video[0]?.totalVideos || 0,
        totalViews: video[0]?.totalViews || 0,
        totalLikes: video[0]?.totalLikes || 0
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channelStats, "Channel stats fetched successfully"))
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user?._id

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                createdAt: {
                    $dateToParts: {date: "$createdAt"}
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
                _id: 0,
                title: 1,
                description: 1,
                views: 1,
                "thumbnail.url": 1,
                "videoFile.url": 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1
                },
                duration: 1,
                owner: 1,
                isPublished: 1,
                likesCount: 1
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"))
});

export {
    getChannelStats, 
    getChannelVideos
    }