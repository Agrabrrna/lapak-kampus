const multer = require('multer');
const path = require('path');

// Configure storage to memory
const storage = multer.memoryStorage();

// File filter (jpg/png/mp4/webm)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|mp4|webm/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Tipe file tidak didukung! Hanya diperbolehkan format JPG, JPEG, PNG, MP4, atau WEBM.'));
};

// Multer middleware limit to max 3 files, 20MB each
const uploadReviewMedia = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: fileFilter
});

module.exports = uploadReviewMedia;
