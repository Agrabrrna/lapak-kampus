const multer = require('multer');
const path = require('path');

// Configure storage to memory (no local files created)
const storage = multer.memoryStorage();

// File filter (jpg/png only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Tipe file tidak didukung! Hanya diperbolehkan format JPG, JPEG, atau PNG.'));
};

// Multer middleware limit to max 5 files, 10MB each
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

module.exports = upload;
