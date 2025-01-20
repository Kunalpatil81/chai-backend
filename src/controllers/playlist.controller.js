import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { application } from "express"
import { Video } from "../models/video.model.js"


//TODO: create playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if (!name || !description) {
        throw new ApiError(400, "name and description both are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id,
    })

    if (!playlist) {
        throw new ApiError(500, "something went wrong while creating playlist please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist created successfully"))
});

//TODO: get user playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "playlists fetched successfully"))
});

//TODO: get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {
                "videos.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: 1,
                    fullName: 1,
                    username: 1,
                    "avatar.url": 1
                },
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, playlistVideos, "playlist by id fetched successfully"))
});

// TODO: add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlist id")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (req.user?._id.toString() !== playlist?.owner.toString()) {
        throw new ApiError(401, "You are not authorized to add video to this playlist")
    }

    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {new: true}
    )

    if (!addVideoToPlaylist) {
        throw new ApiError(500, "something went wrong while adding video to playlist please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, addVideoToPlaylist, "Video added to playlist successfully"))
});

// TODO: remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlist id")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (!video) {
        throw new ApiError(404, "video not found")
    }

    if (req.user?._id.toString() !== playlist?.owner.toString()) {
        throw new ApiError(401, "You are not authorized to remove video from this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull: {
                videos: videoId
            }
        },
        {new: true}
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "something went wrong while removing video from playlist please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))
});

// TODO: delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (req.user?._id.toString() !== playlist?.owner.toString()) {
        throw new ApiError(401, "You are not authorized to delete this playlist")
    }

    const deletePlaylist = await Playlist.findByIdAndDelete(
        playlist?._id
    )

    if (!deletePlaylist) {
        throw new ApiError(500, "something went wrong while deleting playlist please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"))
});

//TODO: update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    if (!name || !description) {
        throw new ApiError(400, "name and description both are required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (req.user?._id.toString() !== playlist?.owner.toString()) {
        throw new ApiError(401, "You are not authorized to update this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description
            }
        },
        {new: true}
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "something went wrong while updating playlist please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "playlist updated successfully"))
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}