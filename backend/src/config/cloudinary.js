const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Product image storage
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'project-x/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }],
  },
});

// Complaint proof storage
const complaintStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'project-x/complaints',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    resource_type: 'auto',
  },
});

// Avatar storage
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'project-x/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF allowed.'), false);
  }
};

module.exports = {
  uploadProduct: multer({ storage: productStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadComplaint: multer({ storage: complaintStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }),
  uploadAvatar: multer({ storage: avatarStorage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } }),
  cloudinary,
};
