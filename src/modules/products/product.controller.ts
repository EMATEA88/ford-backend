import { Request, Response } from 'express'
import { ProductService } from './product.service'

export class ProductController {

  static async list(req: Request, res: Response) {
    const data = await ProductService.list()

    return res.json({
      success: true,
      data
    })
  }

  static async detail(req: Request, res: Response) {
    const productId = Number(req.params.id)

    const data = await ProductService.detail(productId)

    return res.json({
      success: true,
      data
    })
  }

  static async purchase(req: Request, res: Response) {
    if (!req.user) {
  throw new Error('UNAUTHORIZED')
}

const userId = req.user.id
    const { productId } = req.body

    const data = await ProductService.purchase(userId, productId)

    return res.json({
      success: true,
      data
    })
  }

  static async myProducts(req: Request, res: Response) {
    if (!req.user) {
  throw new Error('UNAUTHORIZED')
}

const userId = req.user.id

    const data = await ProductService.myProducts(userId)

    return res.json({
      success: true,
      data
    })
  }
}