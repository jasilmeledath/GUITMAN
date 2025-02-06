const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");

// Resolve the project root directory
const rootDir = path.resolve(__dirname, "../../");

// Dynamic storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;

    // Set the upload path based on the URL
    if (req.baseUrl.includes("category")) {
      uploadPath = path.join(rootDir, "public/uploads/category-images");
    } else {
      uploadPath = path.join(rootDir, "public/uploads/product-images");
    }

    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// Middleware for resizing images
const resizeImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const imagePromises = req.files.map(async (file) => {
      const timestamp = Date.now();
      const resizedDir = path.join(
        rootDir,
        `public/uploads/${
          req.baseUrl.includes("category") ? "category-images" : "product-images"
        }`
      );

      // Create resized directory if it doesn't exist
      if (!fs.existsSync(resizedDir)) {
        fs.mkdirSync(resizedDir, { recursive: true });
      }

      const resizedFilePath = path.join(
        resizedDir,
        `resized-${timestamp}-${file.originalname}`
      );

      // Resize the image and save it
      await sharp(file.path)
        .resize(800, 800, { fit: "cover" })
        .jpeg({ quality: 90 })
        .toFile(resizedFilePath);

      // Delete the original file after resizing
      fs.unlinkSync(file.path);

      // Return the path for the resized file (excluding `public`)
      return `uploads/${
        req.baseUrl.includes("category") ? "category-images" : "product-images"
      }/resized-${timestamp}-${file.originalname}`;
    });

    // Collect all resized image paths
    req.body.images = await Promise.all(imagePromises);
    next();
  } catch (error) {
    console.error("Error resizing images:", error);
    res.status(500).json({ message: "Error processing images." });
  }
};

module.exports = { upload, resizeImages };