import { Request, Response } from "express"
import { UserKYCService } from "./user.kyc.service"
import cloudinary from "../../config/cloudinary"

export class UserKYCController {

  /* ================= SUBMIT KYC ================= */
  static async submit(req: Request, res: Response) {
    try {

      const userId = (req as any).userId
      const { fullName } = req.body

      if (!fullName || fullName.trim().length < 5) {
        return res.status(400).json({
          message: "FULL_NAME_REQUIRED"
        })
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[]
      }

      if (!files?.frontImage || !files?.backImage || !files?.selfieImage) {
        return res.status(400).json({
          message: "ALL_IMAGES_REQUIRED"
        })
      }

      const uploadToCloudinary = (file: Express.Multer.File): Promise<string> => {
        return new Promise((resolve, reject) => {

          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "kyc",
              resource_type: "image"
            },
            (error, result) => {
              if (error || !result) {
                console.error("CLOUDINARY_ERROR:", error)
                return reject(new Error("UPLOAD_FAILED"))
              }
              resolve(result.secure_url)
            }
          )

          stream.end(file.buffer)
        })
      }

      const frontImageUrl = await uploadToCloudinary(files.frontImage[0])
      const backImageUrl = await uploadToCloudinary(files.backImage[0])
      const selfieImageUrl = await uploadToCloudinary(files.selfieImage[0])

      const result = await UserKYCService.submit(
        userId,
        fullName.trim(),
        frontImageUrl,
        backImageUrl,
        selfieImageUrl
      )

      return res.json(result)

    } catch (error: any) {
      console.error("KYC_SUBMIT_ERROR:", error)
      return res.status(400).json({
        message: error.message || "KYC_SUBMIT_FAILED"
      })
    }
  }

  /* ================= STATUS ================= */
  static async status(req: Request, res: Response) {
    try {

      const userId = (req as any).userId
      const result = await UserKYCService.status(userId)

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }
}