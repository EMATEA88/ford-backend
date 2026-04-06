import { Request, Response } from 'express'
import { ReferralService } from './referral.service'

export class ReferralController {
  static async myTeam(req: Request, res: Response) {
    try {
      // 1. Verificação de segurança (Auth Middleware deve garantir o req.user)
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Sessão expirada ou utilizador não autenticado.'
        })
      }

      const userId = Number(req.user.id)

      // 2. Chama o serviço que agora já retorna os níveis 1, 2 e 3 corrigidos
      const data = await ReferralService.getMyTeam(userId)

      // 3. Retorno de sucesso
      return res.json({
        success: true,
        data: {
          link: data.link,
          stats: {
            level1: data.level1,
            level2: data.level2,
            level3: data.level3
          },
          members: data.members // A lista completa para o frontend filtrar
        }
      })

    } catch (error: any) {
      console.error('REFERRAL ERROR 👉', error)

      // Tratamento de erro específico
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Utilizador não encontrado no sistema.'
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Erro ao carregar a equipa. Tente novamente mais tarde.'
      })
    }
  }
}