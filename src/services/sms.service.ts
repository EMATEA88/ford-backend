import Twilio from 'twilio'

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export class SmsService {
  static async sendOtp(phone: string, code: string) {
    await client.messages.create({
      body: `Seu código de verificação é: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone
    })
  }
}