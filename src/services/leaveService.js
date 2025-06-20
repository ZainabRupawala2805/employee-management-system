const Leave = require("../models/Leave");
const User = require("../models/User");
const CustomError = require('../errors');
const { StatusCodes } = require('http-status-codes');
const mongoose = require("mongoose");

// const createLeave = async (leaveData) => {
//     try {
//         const { userId, startDate, endDate, reason, leaveType } = leaveData;

//         // Fetch the user to check available leaves
//         const user = await User.findById(userId);

//         if (!user) {
//             throw new Error("User not found");
//         }


//         const timeDiff = new Date(endDate) - new Date(startDate);
//         const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

//         // Check if the user has enough leaves based on leaveType
//         if (leaveType === "Sick") {
//             if (user.sickLeave < daysDiff) {
//                 throw new Error("Not enough sick leaves available");
//             }
//         } else if (leaveType === "Paid") {
//             if (user.paidLeave < daysDiff) {
//                 throw new Error("Not enough paid leaves available");
//             }
//         } else {
//             throw new Error("Invalid leave type");
//         }

//         // Create the leave
//         const leave = new Leave(leaveData);
//         await leave.save();

//         return leave;
//     } catch (error) {
//         throw new Error(error.message);
//     }
// };

const generateLeaveDetails = (startDate, endDate) => {
    let details = {};
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const formattedDate = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD format
        details[formattedDate] = "Full Day"; // Default to Full Day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return details;
};

const createLeave = async (body, file) => {
    const { startDate, endDate, reason, leaveType, userId, halfDayDates } = body;

    if (!startDate || !reason || !leaveType) {
        throw new Error('All required fields must be filled');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
        throw new Error('Start date cannot be after end date');
    }

    let leaveDetails = generateLeaveDetails(start, end);

    if (halfDayDates) {
        let parsedHalfDays = typeof halfDayDates === 'string'
            ? JSON.parse(halfDayDates)
            : halfDayDates;

        Object.entries(parsedHalfDays).forEach(([date, session]) => {
            if (leaveDetails[date]) {
                leaveDetails[date] = session === 'First Half' || session === 'Second Half'
                    ? session
                    : 'Full Day';
            }
        });
    }

    await Leave.create({
        userId,
        startDate: start,
        endDate: end,
        reason,
        status: 'Pending',
        leaveType,
        leaveDetails,
        attachment: file ? `/uploads/${file.filename}` : null,
        attachmentOriginalName: file ? file.originalname : null,
    });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch the user details
    const user = await User.findById(userObjectId).select("name sickLeave paidLeave unpaidLeave availableLeaves");
    if (!user) {
        throw new Error("User not found");
    }

    // Fetch leaves associated with the user
    const leaves = await Leave.find({ userId: userObjectId })
        .populate("userId", "name")
        .sort({ startDate: -1 });

    return { user, leaves };
};



const updateLeaveStatus = async (leaveId, status) => {
    try {
        // Find leave and populate user, excluding password
        const leave = await Leave.findById(leaveId)
            .populate({
                path: "userId",
                select: "-password" // Explicitly exclude password
            });

        if (!leave) {
            throw new Error("Leave not found");
        }

        // Fetch the user to update leave balances (still exclude password)
        const user = await User.findById(leave.userId._id)
            .select("-password");

        if (!user) {
            throw new Error("User not found");
        }

        // Ensure numeric fields are valid numbers
        user.availableLeaves = Number(user.availableLeaves) || 0;
        user.unpaidLeave = Number(user.unpaidLeave) || 0;
        user.paidLeave = Number(user.paidLeave) || 0;
        user.sickLeave = Number(user.sickLeave) || 0;
        user.totalLeaves = Number(user.totalLeaves) || 0;

        // Calculate the total leave days
        let totalDays = 0;

        Object.values(leave.leaveDetails).forEach(dayType => {
            if (dayType === "Full Day") {
                totalDays += 1;
            } else if (dayType === "First Half" || dayType === "Second Half") {
                totalDays += 0.5;
            }
        });

        // Check if the leave is being approved
        if (status === "Approved") {
            switch (leave.leaveType) {
                case "Paid":
                    if (user.paidLeave < totalDays) {
                        throw new Error("Not enough paid leaves available");
                    }
                    if (user.availableLeaves < totalDays) {
                        throw new Error("Not enough available leaves");
                    }
                    user.paidLeave -= totalDays;
                    user.availableLeaves -= totalDays;
                    break;

                case "Sick":
                    if (user.sickLeave < totalDays) {
                        throw new Error("Not enough sick leaves available");
                    }
                    if (user.availableLeaves < totalDays) {
                        throw new Error("Not enough available leaves");
                    }
                    user.sickLeave -= totalDays;
                    user.availableLeaves -= totalDays;
                    break;

                case "Unpaid":
                    user.unpaidLeave += totalDays;
                    break;

                default:
                    throw new Error("Invalid leave type");
            }

            user.totalLeaves += totalDays;
            await user.save();
        }

        // Update the leave status
        leave.status = status;
        await leave.save();

        // Convert to plain object and remove password if it exists
        const result = leave.toObject();
        if (result.userId && result.userId.password) {
            delete result.userId.password;
        }

        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};

// const getAllLeaves = async () => {
//     try {
//         const leaves = await Leave.find()
//             .populate({
//                 path: "userId",
//                 select: "name role", 
//                 populate: {
//                     path: "role", 
//                     select: "name", 
//                 },
//             })
//             .exec();

//         return leaves;
//     } catch (error) {
//         throw new Error(error.message);
//     }
// };


const getLeaveById = async (leaveId) => {
    try {
        // Trim and validate the ID
        const trimmedId = String(leaveId).trim();

        if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
            throw new Error('Invalid leave ID format');
        }

        const leaveObjectId = new mongoose.Types.ObjectId(trimmedId);

        const leave = await Leave.findById(leaveObjectId)
            .populate({
                path: 'userId',
                select: 'name',
                // populate: {
                //     path: 'role',
                //     select: 'name'
                // }
            });

        if (!leave) {
            throw new Error('Leave not found');
        }

        return leave;
    } catch (error) {
        console.error(`Error fetching leave ${leaveId}:`, error);
        throw error;
    }
};
const getLeavesByUserId = async (userId) => {
    try {
        // Validate the user ID format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID format");
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Fetch the user details
        const user = await User.findById(userObjectId).select("name sickLeave paidLeave unpaidLeave availableLeaves");
        if (!user) {
            throw new Error("User not found");
        }

        // Fetch leaves associated with the user
        const leaves = await Leave.find({ userId: userObjectId })
            .populate({
                path: "userId",
                select: "name",
                // populate: {
                //     path: "role",
                //     select: "name",
                // },
            })
            .sort({ startDate: -1 });

        return { leaves, user };
    } catch (error) {
        throw error;
    }
};



const getFilteredLeaves = async (userId, userRole, reportBy) => {
    try {
        let query = null;
        console.log(reportBy)

        if (userRole === "Founder") {
            query = {}; // All records
        } else if (Array.isArray(reportBy) && reportBy.filter(Boolean).length > 0) {
            // Only use valid non-null/non-undefined userIds
            query = { userId: { $in: reportBy.filter(Boolean) } };
        } else {
            // If reportBy is empty or not an array, return empty list
            return [];
        }

        const leaves = await Leave.find(query)
            .populate({
                path: "userId",
                select: "name",
            })
            .sort({ startDate: -1 });

        return leaves;
    } catch (error) {
        throw new Error(error.message);
    }
};


// const updateLeave = async (userId, leaveId, updateData, file) => {
//     if (!mongoose.Types.ObjectId.isValid(leaveId)) {
//         throw new Error('Invalid leave ID format');
//     }

//     const existingLeave = await Leave.findById(leaveId);
//     if (!existingLeave) {
//         throw new Error('Leave not found');
//     }

//     if (updateData.status && updateData.status !== existingLeave.status) {
//         throw new Error('Use the status update API to change leave status');
//     }

//     // Convert date strings to Date objects
//     if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
//     if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

//     const startDate = updateData.startDate || existingLeave.startDate;
//     const endDate = updateData.endDate || existingLeave.endDate;

//     if (new Date(startDate) > new Date(endDate)) {
//         throw new Error('Start date cannot be after end date');
//     }

//     // 1. Regenerate leaveDetails
//     let newLeaveDetails;

//     // 2. Apply any half-day overrides
//     if (updateData.halfDayDates) {
//         let halfDayObj = typeof updateData.halfDayDates === 'string'
//             ? JSON.parse(updateData.halfDayDates)
//             : updateData.halfDayDates;

//         Object.entries(halfDayObj).forEach(([date, session]) => {
//             if (newLeaveDetails[date]) {
//                 newLeaveDetails[date] = session === "First Half" || session === "Second Half" ? session : "Full Day";
//             }
//         });
//     }

//     // 3. Track differences in leaveDetails and build leaveHistory
//     const oldLeaveDetails = existingLeave.leaveDetails || {};
//     const leaveHistory = {};

//     for (const date in newLeaveDetails) {
//         const oldValue = oldLeaveDetails[date];
//         const newValue = newLeaveDetails[date];
//         if (oldValue && oldValue !== newValue) {
//             leaveHistory[date] = oldValue;
//         }
//     }

//     updateData.leaveDetails = newLeaveDetails;

//     // Only store leaveHistory if there are changes
//     if (Object.keys(leaveHistory).length > 0) {
//         updateData.leaveHistory = {
//             ...existingLeave.leaveHistory, // Preserve existing history
//             ...leaveHistory,
//         };
//     }

//     // 4. Attach new file if present
//     if (file) {
//         updateData.attachment = `/uploads/${file.filename}`;
//         updateData.attachmentOriginalName = file.originalname;
//     }

//     // 5. Save the updated leave
//     await Leave.findByIdAndUpdate(
//         leaveId,
//         { $set: updateData },
//         { new: true, runValidators: true }
//     );

//     // 6. Return updated user + leaves
//     const userObjectId = new mongoose.Types.ObjectId(userId);
//     const user = await User.findById(userObjectId).select("name sickLeave paidLeave unpaidLeave availableLeaves");
//     if (!user) {
//         throw new Error("User not found");
//     }

//     const leaves = await Leave.find({ userId: userObjectId })
//         .populate("userId", "name")
//         .sort({ startDate: -1 });

//     return { user, leaves };
// };


const updateLeave = async (userId, leaveId, updateData, file) => {
    if (!mongoose.Types.ObjectId.isValid(leaveId)) {
        throw new Error('Invalid leave ID format');
    }

    const existingLeave = await Leave.findById(leaveId);
    if (!existingLeave) {
        throw new Error('Leave not found');
    }

    if (updateData.status && updateData.status !== existingLeave.status) {
        throw new Error('Use the status update API to change leave status');
    }
    // Convert date strings to Date objects
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const startDate = updateData.startDate || existingLeave.startDate;
    const endDate = updateData.endDate || existingLeave.endDate;

    if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date cannot be after end date');
    }

    // Generate leaveDetails based on date range
    let newLeaveDetails = generateLeaveDetails(startDate, endDate);

    // Apply half-day changes
    if (updateData.halfDayDates) {
        const halfDayDates = typeof updateData.halfDayDates === 'string'
            ? JSON.parse(updateData.halfDayDates)
            : updateData.halfDayDates;

        for (const [date, session] of Object.entries(halfDayDates)) {
            if (newLeaveDetails[date]) {
                newLeaveDetails[date] = session === "First Half" || session === "Second Half" ? session : "Full Day";
            }
        }
    }

    // Compare with old leaveDetails
    const oldLeaveDetails = existingLeave.leaveDetails || {};
    const oldLeaveHistory = existingLeave.leaveHistory || {};
    const leaveHistory = { ...oldLeaveHistory };

    for (const date in newLeaveDetails) {
        const oldVal = oldLeaveDetails[date];
        const newVal = newLeaveDetails[date];

        if (oldVal && newVal && oldVal !== newVal) {
            leaveHistory[date] = oldVal;  // only store last value
        }
    }

    updateData.leaveDetails = newLeaveDetails;
    if (Object.keys(leaveHistory).length > 0) {
        updateData.leaveHistory = leaveHistory;
    }

    // 4. Attach new file if present
    if (file) {
        updateData.attachment = `/uploads/${file.filename}`;
        updateData.attachmentOriginalName = file.originalname;
    }

    // 5. Save the updated leave
    await Leave.findByIdAndUpdate(
        leaveId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    // 6. Return updated user + leaves
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).select("name sickLeave paidLeave unpaidLeave availableLeaves");
    if (!user) {
        throw new Error("User not found");
    }

    const leaves = await Leave.find({ userId: userObjectId })
        .populate("userId", "name")
        .sort({ startDate: -1 });

    return { user, leaves };
};


module.exports = {
    createLeave,
    updateLeaveStatus,
    getLeaveById,
    getLeavesByUserId,
    getFilteredLeaves,
    generateLeaveDetails,
    updateLeave
};