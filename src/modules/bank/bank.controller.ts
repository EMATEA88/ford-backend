import { Request, Response } from 'express'
import { BankService } from './bank.service'

export class BankController {
  static async list(req: Request, res: Response) {
    try {
      const banks = await BankService.list()
      return res.json(banks)
    } catch (error) {
      console.error('BANK_LIST_ERROR:', error)
      return res.status(500).json({ message: 'Failed to load banks' })
    }
  }
}
