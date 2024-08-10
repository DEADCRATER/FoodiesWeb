const asyncHandler = require("express-async-handler");
const Breakfast = require("../models/breakfast");
const Lunch = require("../models/lunch");
const Dinner = require("../models/dinner");
const Canteen = require("../models/canteenLoginInfo");
const { uploader, uploadImage } = require("../config/cloudinaryConfig");

const Feedback = require("../models/feedback");
const Session = require("../models/session");

const getAllCanteen = async (req, res, next) => {
  try {
    const canteenData = await Canteen.find({});

    res.status(200).json({
      success: true,
      data: canteenData,
      message: "Entire canteens fetched",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error });
  }
};

const getCanteenData = async(req, res) => {
  const canteenId = req.params.id;
  try {
    const canteenData = await Canteen.findById(canteenId);
    console.log("this is canteen",canteenData);
     if(!canteenData){
      res.status(500).json({
        success: false,
        message: "Error while fetching canteen data",
      });
    }

    return  res.status(200).json({
      success: true,
      data: canteenData,
      message: "Canteen Data Successfully!",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error while fetching canteen data",
    });
  }
}

const getBreakfast = async (req, res, next) => {
  try {
    const id = req.params.id;

    const breakfastData = await Breakfast.find({ canteen: id })
      .select("dish dishId dishImage description") // Select all fields you need
      .exec();

    res.status(200).json({
      success: true,
      data: breakfastData,
      message: "Entire breakfast was fetched",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
//   catch(error){
//     res.status(500).json({success : false , error : error});
//   }
// }
const feedback = async (req, res) => {
  const { canteenId, feedback, rating } = req.body;
  const token = req.body.studentId; // This is the token

  try {
    // Find the session with the given token
    const session = await Session.findOne({ token });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const userId = session.userId; // Extract userId from the session

    const newFeedback = new Feedback({
      canteen: canteenId,
      student: userId,
      comment: feedback,
      rating: rating,
    });

    const savedFeedback = await newFeedback.save();
    res.status(201).json(savedFeedback);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving feedback", error: error.message });
  }
};
const canteenFeedbackRender = async (req, res) => {
  try {
    const reviews = await Feedback.aggregate([
      { $sample: { size: 3 } }, // Fetch 3 random feedback entries
      {
        $lookup: {
          from: "students", // Collection name for students
          localField: "student",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      {
        $lookup: {
          from: "canteens", // Collection name for canteens
          localField: "canteen",
          foreignField: "_id",
          as: "canteenInfo",
        },
      },
      {
        $addFields: {
          studentName: { $arrayElemAt: ["$studentInfo.name", 0] },
          canteenName: { $arrayElemAt: ["$canteenInfo.name", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          comment: 1,
          rating: 1,
          createdAt: 1,
          studentName: 1,
          canteenName: 1,
        },
      },
    ]);

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// const getLunch = async(req , res , next) =>{

//   try{
//     const id  = req.params.id;

//     const lunchData = await Lunch.find({ canteen: id }).select("dish").select("dishId").exec();

const getLunch = async (req, res, next) => {
  try {
    const id = req.params.id;

    const lunchData = await Lunch.find({ canteen: id })
      .select("dish dishId dishImage description")
      .exec();

    res.status(200).json({
      success: true,
      data: lunchData,
      message: "Entire lunch was fetched",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const getDinner = async (req, res, next) => {
  try {
    const id = req.params.id;

    const dinnerData = await Dinner.find({ canteen: id })
      .select("dish dishId dishImage description")
      .exec();

    res.status(200).json({
      success: true,
      data: dinnerData,
      message: "Entire dinner was fetched",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Controller function to get the canteen's dashboard
const getCanteenDashboard = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;

  const breakfastDishes = await Breakfast.find({ canteen: canteenId })
    .select("dish")
    .exec();
  const lunchDishes = await Lunch.find({ canteen: canteenId })
    .select("dish")
    .exec();
  const dinnerDishes = await Dinner.find({ canteen: canteenId })
    .select("dish")
    .exec();

  res.json({
    breakfast: breakfastDishes.length > 0 ? breakfastDishes : ["Not Added Yet"],
    lunch: lunchDishes.length > 0 ? lunchDishes : ["Not Added Yet"],
    dinner: dinnerDishes.length > 0 ? dinnerDishes : ["Not Added Yet"],
  });
});

// Controller function to add a breakfast dish
const addBreakfastDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const { dish, dishId, description, dishImage } = req.body;

  let uploadedImageUrl = null;

  if (dishImage) {
    try {
      const uploadResult = await uploadImage(dishImage); // Assuming dishImage is already a base64 string
      uploadedImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  const existingDish = await Breakfast.findOne({
    canteen: canteenId,
    dish,
  }).exec();

  if (existingDish) {
    return res.status(400).json({ message: "Dish already added" });
  }

  const newDish = new Breakfast({
    canteen: canteenId,
    dish,
    dishId,
    dishImage: uploadedImageUrl,
    description,
  });
  await newDish.save();

  res.status(201).json({ message: "Dish added successfully", dish: newDish });
});

// Controller function to remove a breakfast dish
const removeBreakfastDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const dish = req.body._id;

  await Breakfast.deleteOne({ _id: dish }).exec();
  res.json({ message: "Dish removed successfully" });
});

// Controller function to add a lunch dish
const addLunchDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const { dish, dishId, description, dishImage } = req.body;

  let uploadedImageUrl = null;

  if (dishImage) {
    try {
      const uploadResult = await uploadImage(dishImage); // Assuming dishImage is already a base64 string
      uploadedImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  const existingDish = await Breakfast.findOne({
    canteen: canteenId,
    dish,
  }).exec();

  if (existingDish) {
    return res.status(400).json({ message: "Dish already added" });
  }

  const newDish = new Lunch({
    canteen: canteenId,
    dish,
    dishId,
    dishImage: uploadedImageUrl,
    description,
  });
  await newDish.save();

  res.status(201).json({ message: "Dish added successfully", dish: newDish });
});

// Controller function to remove a lunch dish
const removeLunchDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const dish = req.body._id;

  await Lunch.deleteOne({ _id: dish }).exec();
  res.json({ message: "Dish removed successfully" });
});

// Controller function to add a dinner dish
const addDinnerDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const { dish, dishId, description, dishImage } = req.body;

  let uploadedImageUrl = null;

  if (dishImage) {
    try {
      const uploadResult = await uploadImage(dishImage); // Assuming dishImage is already a base64 string
      uploadedImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  const existingDish = await Breakfast.findOne({
    canteen: canteenId,
    dish,
  }).exec();

  if (existingDish) {
    return res.status(400).json({ message: "Dish already added" });
  }

  const newDish = new Dinner({
    canteen: canteenId,
    dish,
    dishId,
    dishImage: uploadedImageUrl,
    description,
  });
  await newDish.save();

  res.status(201).json({ message: "Dish added successfully", dish: newDish });
});

// Controller function to remove a dinner dish
const removeDinnerDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const dish = req.body._id;

  await Dinner.deleteOne({ _id: dish }).exec();
  res.json({ message: "Dish removed successfully" });
});
// Controller function to update canteen details

const updateCanteen = async (req, res, next) => {
  try {
    const canteenId = req.params.id;
    const { name, email, collegeName, canteenImage } = req.body;

    // Process the uploaded file if exists
    if (req.file) {
      const filePath = `public/uploads/${req.file.originalname}`;
      const uploadedImage = await uploader.upload(filePath);
      req.body.canteenImage = uploadedImage.url; // Update the canteenImage with the uploaded file URL
    }

    // Find the canteen by ID and update
    const canteen = await Canteen.findByIdAndUpdate(canteenId, req.body, {
      new: true,
    });

    // If canteen not found, return error
    if (!canteen) {
      return res
        .status(404)
        .json({ success: false, message: "Canteen not found" });
    }

    // Return success response
    res
      .status(200)
      .json({
        success: true,
        message: "Canteen updated successfully",
        data: canteen,
      });
  } catch (error) {
    // Handle errors
    console.error("Error updating canteen:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
//controller to update Canteen FoddItem Details

// Controller function to update a breakfast dish
const updateBreakfastDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const { dishId, dish, description, dishImage } = req.body;

  let uploadedImageUrl = null;

  if (dishImage) {
    try {
      const uploadResult = await uploadImage(dishImage);
      uploadedImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  try {
    const updateFields = { dish, description };
    if (uploadedImageUrl) {
      updateFields.dishImage = uploadedImageUrl;
    }

    const updatedDish = await Breakfast.findOneAndUpdate(
      { _id: dishId, canteen: canteenId },
      { $set: updateFields },
      { new: true }
    ).exec();

    if (!updatedDish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    res.json({ message: "Dish updated successfully", data: updatedDish });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
//Controller to update Lunch
const updateLunchDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const { dishId, dish, description, dishImage } = req.body;

  let uploadedImageUrl = null;

  if (dishImage) {
    try {
      const uploadResult = await uploadImage(dishImage);
      uploadedImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  try {
    const updateFields = { dish, description };
    if (uploadedImageUrl) {
      updateFields.dishImage = uploadedImageUrl;
    }

    const updatedDish = await Lunch.findOneAndUpdate(
      { _id: dishId, canteen: canteenId },
      { $set: updateFields },
      { new: true }
    ).exec();

    if (!updatedDish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    res.json({ message: "Dish updated successfully", data: updatedDish });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
//Controller to update dinner

const updateDinnerDish = asyncHandler(async (req, res, next) => {
  const canteenId = req.params.id;
  const { dishId, dish, description, dishImage } = req.body;

  let uploadedImageUrl = null;

  if (dishImage) {
    try {
      const uploadResult = await uploadImage(dishImage);
      uploadedImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  try {
    const updateFields = { dish, description };
    if (uploadedImageUrl) {
      updateFields.dishImage = uploadedImageUrl;
    }

    const updatedDish = await Dinner.findOneAndUpdate(
      { _id: dishId, canteen: canteenId },
      { $set: updateFields },
      { new: true }
    ).exec();

    if (!updatedDish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    res.json({ message: "Dish updated successfully", data: updatedDish });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const addSocialMediaLinks = asyncHandler(async (req, res) => {
  const { canteenId, instaLink, faceLink, youTubeLink, linkedInLink } =
    req.body;

  try {
    const canteen = await Canteen.findById(canteenId);

    if (!canteen) {
      return res.status(404).json({ message: "Canteen not found" });
    }

    if (canteen.canteenSocialMediaLinks) {
      canteen.canteenSocialMediaLinks.Instagram = instaLink;

      canteen.canteenSocialMediaLinks.Facebook = faceLink;

      canteen.canteenSocialMediaLinks.Youtube = youTubeLink;

      canteen.canteenSocialMediaLinks.LinkedIn = linkedInLink;
    }

    await canteen.save();

    return res
      .status(200)
      .json({ message: "Social media links added successfully" });
  } catch (error) {
    console.error("Error in Adding Links:", error);
    return res
      .status(500)
      .json({ message: "Error in adding social media links" });
  }
});

// Add Feedback to Canteen
const addFeedback = asyncHandler(async (req, res) => {
  const { canteenId, rating, comment } = req.body;
  const studentId = req.user.id;

  try {
    // Check if the canteen exists
    const canteen = await Canteen.findById(canteenId);
    if (!canteen) {
      return res.status(401).json({
        message : "Not canteen found!"
      })
    }

    // Create new feedback
    const feedback = new Feedback({
      student: studentId,
      canteen: canteenId,
      comment,
      rating,
    });

    // Save feedback
    await feedback.save();

    // Calculate the new overall rating
    const feedbacks = await Feedback.find({ canteen: canteenId });
    const totalRatings = feedbacks.length;
    const sumRatings = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    canteen.overallRating = sumRatings / totalRatings;

    // Save the updated canteen document
    await canteen.save();

    return res.status(200).json({
      message :"Feedback added successfully!",
      canteen : canteen
    })
  } catch (error) {
    console.error("Error adding feedback:", error);
    return res.status(500).json({
      message : "Error while adding feedback"
    })
  }
});

const addTiming = asyncHandler(async (req, res, next) => {
  const { day, morningTime, afternoonTime, eveningTime } = req.body;
  console.log("Inside save time");
  const canteenId = req.params.id;
  // Find the canteen by ID
  const canteen = await Canteen.findById(canteenId);

  if (!canteen) {
    return res.status(404).json({
      message: "Canteen not found!",
    });
  }

  // Update the timing for the specified day
  canteen.timing[day] = {
    morning: morningTime || canteen.timing[day].morning,
    afternoon: afternoonTime || canteen.timing[day].afternoon,
    evening: eveningTime || canteen.timing[day].evening,
  };

  // Save the updated canteen document
  await canteen.save();

  // Send a success response
  return res.status(200).json({
    message: "Canteen timing updated successfully!",
    timing: canteen.timing,
  });
});

const getTiming = asyncHandler(async (req, res) => {
   const canteenId = req.params.id;
   // Find the canteen by ID
  const canteen = await Canteen.findById(canteenId);
  if (!canteen) {
    return res.status(404).json({
      message: "Canteen not found!",
    });
  }

  if(!canteen.timing){
    return res.status(404).json({
      message: "Don't find timing!",
    });
  }
  
  const timing = canteen.timing;

  return res.status(200).json({
    message : "Canteen Timing",
    timing : timing
  })


})
module.exports = {
  getCanteenDashboard,
  addBreakfastDish,
  removeBreakfastDish,
  addLunchDish,
  removeLunchDish,
  addDinnerDish,
  removeDinnerDish,
  getAllCanteen,
  getBreakfast,
  getLunch,
  getDinner,
  updateCanteen,
  updateBreakfastDish,
  updateLunchDish,
  updateDinnerDish,
  feedback,
  canteenFeedbackRender,
  addSocialMediaLinks,
  getCanteenData,
  addFeedback,
  addTiming,
  getTiming
};
