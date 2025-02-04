const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configure storage settings with dynamic destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (req.baseUrl.includes('category')) {
      uploadPath = 'public/uploads/category-images';
    } else {
      uploadPath = 'public/uploads/product-images';
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Set file filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and GIF file types are allowed.'));
  }
};

// Multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
});

// Middleware for image resizing
const resizeImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
      const imagePromises = req.files.map(async (file, index) => {
          const timestamp = Date.now();
          const outputPath = `uploads/${req.baseUrl.includes('category') ? 'category-images' : 'product-images'}/resized-${timestamp}-${index}.jpeg`;
          const fullOutputPath = `public/${outputPath}`;

          await sharp(file.path)
              .resize(800, 800, { fit: 'cover' }) // Resize to 800x800 with cropping
              .jpeg({ quality: 90 })
              .toFile(fullOutputPath);

          // Delete the original file
          fs.unlinkSync(file.path);

          return { ...file, path: outputPath }; // Update file path
      });

      req.files = await Promise.all(imagePromises); // Ensure req.files is correctly populated
      next();
  } catch (error) {
      console.error('Error processing images:', error);
      return res.status(500).json({ message: 'Error processing images.' });
  }
};

module.exports = { upload, resizeImages };
