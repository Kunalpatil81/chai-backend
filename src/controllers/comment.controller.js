import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const commentsAggregate = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
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
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    )

    return res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched successfully"))

});

// TODO: add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Something went wrong while adding comment please try again")
    }

    return res
    .status(201)
    .json(new ApiResponse(201, comment, "comment added successfully"))
}); 

// TODO: update a comment
const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (req.user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(401, "You are not authorized to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content,
            }
        },
        {
            new: true
        }
    )

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while updating comment please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
});

// TODO: delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (req.user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(401, "You are not authorized to delete this comment")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if (!deletedComment) {
        throw new ApiError(500, "Something went wrong while deleting comment please try again")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {commentId}, "Comment deleted successfully"))
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }