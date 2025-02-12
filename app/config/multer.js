const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");
const { status } = require("http-status");

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
    const uploadType = req.baseUrl.includes("category") ? "category-images" : "product-images";
    const resizedDir = path.join(rootDir, `public/uploads/${uploadType}`);

    // Create the resized directory if it doesn't exist
    if (!fs.existsSync(resizedDir)) {
      fs.mkdirSync(resizedDir, { recursive: true });
    }

    const imagePromises = req.files.map(async (file, index) => {
      const timestamp = Date.now();
      let resizedFileName, resizedFilePath;

      if (index === 0) {
        // For the first image, resize by width only (preserving aspect ratio)
        // so that the full image is visible in product cards.
        resizedFileName = `original-${timestamp}-${file.originalname}`;
        resizedFilePath = path.join(resizedDir, resizedFileName);

        await sharp(file.path)
          .resize({ width: 800, withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toFile(resizedFilePath);
      } else {
        // For all other images, use the current square cropping (800x800, cover)
        resizedFileName = `resized-${timestamp}-${file.originalname}`;
        resizedFilePath = path.join(resizedDir, resizedFileName);

        await sharp(file.path)
          .resize(800, 800, { fit: "cover" })
          .jpeg({ quality: 90 })
          .toFile(resizedFilePath);
      }

      // Delete the original file after resizing
      fs.unlinkSync(file.path);

      // Return the path for the resized file (excluding the "public" folder)
      return `uploads/${uploadType}/${resizedFileName}`;
    });

    // Collect all resized image paths and attach them to req.body.images
    req.body.images = await Promise.all(imagePromises);
    next();
  } catch (error) {
    console.error("Error resizing images:", error);
    res.status(status.INTERNAL_SERVER_ERROR).render("500");
  }
};

module.exports = { upload, resizeImages };
