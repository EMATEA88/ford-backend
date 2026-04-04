import { prisma } from '../lib/prisma'
import { EmailService } from './email.service'

type EmailJob = {
  userId?: number
  to: string
  subject: string
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
}

class EmailQueue {
  private queue: EmailJob[] = []
  private processing = false
  private readonly MAX_ATTEMPTS = 3

  add(job: EmailJob) {
    this.queue.push(job)
    this.process()
  }

  private async process() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()
      if (!job) continue

      let log = await prisma.emailLog.create({
        data: {
          userId: job.userId,
          to: job.to,
          subject: job.subject,
          status: 'PENDING',
          attempts: 0,
        }
      })

      let success = false
      let attempts = 0

      while (!success && attempts < this.MAX_ATTEMPTS) {
        try {
          attempts++

          await EmailService.sendEmail({
            to: job.to,
            subject: job.subject,
            title: job.title,
            content: job.content,
            buttonText: job.buttonText,
            buttonUrl: job.buttonUrl,
          })

          await prisma.emailLog.update({
            where: { id: log.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              attempts,
              error: null
            }
          })

          success = true

        } catch (error: any) {

          await prisma.emailLog.update({
            where: { id: log.id },
            data: {
              status: 'FAILED',
              attempts,
              error: error?.message ?? 'UNKNOWN_ERROR'
            }
          })

          if (attempts >= this.MAX_ATTEMPTS) {
            console.error('EMAIL_MAX_RETRIES_REACHED:', job.to)
          }
        }
      }
    }

    this.processing = false
  }
}

export const emailQueue = new EmailQueue()