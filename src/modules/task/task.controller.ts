import { Request, Response } from 'express'
import { TaskService } from './task.service'

export class TaskController {

  static async complete(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'UNAUTHORIZED'
        })
      }

      const userId = req.user.id

      const data = await TaskService.complete(userId)

      return res.json({
        success: true,
        data
      })

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao completar tarefa'
      })
    }
  }

  static async status(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'UNAUTHORIZED'
        })
      }

      const userId = req.user.id

      const data = await TaskService.status(userId)

      return res.json({
        success: true,
        data
      })

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar status'
      })
    }
  }

  static async history(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'UNAUTHORIZED'
        })
      }

      const userId = req.user.id

      const data = await TaskService.history(userId)

      return res.json({
        success: true,
        data
      })

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar histórico'
      })
    }
  }
}