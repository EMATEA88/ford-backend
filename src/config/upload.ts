import multer from "multer"

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("ONLY_IMAGES_ALLOWED"))
    } else {
      cb(null, true)
    }
  },
})