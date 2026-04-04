import { Router, Request, Response } from 'express'
import { prisma } from '../../../lib/prisma'
import { adminMiddleware } from '../../admin/admin.middleware'

const router = Router()

router.use(adminMiddleware)

const MAX_LENGTH = 120
const MAX_IBAN_LENGTH = 60

function sanitize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

function isValidIbanFormat(iban: string): boolean {
  return /^[A-Z0-9]+$/.test(iban)
}

/**
 * 📄 LISTAR BANCOS
 */
router.get('/', async (_req: Request, res: Response) => {
  try {

    const bancos = await prisma.banco.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        bank: true,
        iban: true,
        createdAt: true
      }
    })

    return res.status(200).json(bancos)

  } catch (error) {
    console.error('[BANK_LIST_ERROR]', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

/**
 * ➕ CRIAR BANCO
 */
router.post('/', async (req: Request, res: Response) => {

  try {

    const name = sanitize(req.body.name)
    const bank = sanitize(req.body.bank)
    const ibanRaw = sanitize(req.body.iban)

    if (!name || !bank || !ibanRaw) {
      return res.status(400).json({ error: 'INVALID_DATA' })
    }

    if (
      name.length > MAX_LENGTH ||
      bank.length > MAX_LENGTH ||
      ibanRaw.length > MAX_IBAN_LENGTH
    ) {
      return res.status(400).json({ error: 'DATA_TOO_LONG' })
    }

    const iban = normalizeIban(ibanRaw)

    if (!isValidIbanFormat(iban)) {
      return res.status(400).json({ error: 'INVALID_IBAN_FORMAT' })
    }

    const result = await prisma.$transaction(async (tx) => {

      const exists = await tx.banco.findUnique({
        where: { iban }
      })

      if (exists) {
        throw new Error('IBAN_ALREADY_EXISTS')
      }

      return tx.banco.create({
        data: {
          name,
          bank,
          iban
        }
      })

    })

    return res.status(201).json(result)

  } catch (error: any) {

    if (error.message === 'IBAN_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'IBAN_ALREADY_EXISTS' })
    }

    console.error('[BANK_CREATE_ERROR]', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

/**
 * ✏️ ATUALIZAR BANCO
 */
router.put('/:id', async (req: Request, res: Response) => {

  try {

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'INVALID_ID' })
    }

    const existing = await prisma.banco.findUnique({
      where: { id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'BANK_NOT_FOUND' })
    }

    const name = sanitize(req.body.name) || existing.name
    const bank = sanitize(req.body.bank) || existing.bank
    const ibanRaw = sanitize(req.body.iban) || existing.iban

    if (
      name.length > MAX_LENGTH ||
      bank.length > MAX_LENGTH ||
      ibanRaw.length > MAX_IBAN_LENGTH
    ) {
      return res.status(400).json({ error: 'DATA_TOO_LONG' })
    }

    const iban = normalizeIban(ibanRaw)

    if (!isValidIbanFormat(iban)) {
      return res.status(400).json({ error: 'INVALID_IBAN_FORMAT' })
    }

    const atualizado = await prisma.$transaction(async (tx) => {

      if (iban !== existing.iban) {

        const ibanExists = await tx.banco.findUnique({
          where: { iban }
        })

        if (ibanExists) {
          throw new Error('IBAN_ALREADY_EXISTS')
        }
      }

      return tx.banco.update({
        where: { id },
        data: {
          name,
          bank,
          iban
        }
      })
    })

    return res.status(200).json(atualizado)

  } catch (error: any) {

    if (error.message === 'IBAN_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'IBAN_ALREADY_EXISTS' })
    }

    console.error('[BANK_UPDATE_ERROR]', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

/**
 * 🗑️ REMOVER BANCO
 */
router.delete('/:id', async (req: Request, res: Response) => {

  try {

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'INVALID_ID' })
    }

    const exists = await prisma.banco.findUnique({
      where: { id }
    })

    if (!exists) {
      return res.status(404).json({ error: 'BANK_NOT_FOUND' })
    }

    await prisma.banco.delete({
      where: { id }
    })

    return res.status(204).send()

  } catch (error) {
    console.error('[BANK_DELETE_ERROR]', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export const bankAdminRoutes = router