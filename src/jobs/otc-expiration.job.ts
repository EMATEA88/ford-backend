import { OTCExpirationService } from '../modules/admin/otc/otc-expiration.service'

export async function runOtcExpirationJob() {
  try {
    const result = await OTCExpirationService.expirePendingOrders()

    console.log(`[OTC EXPIRATION] Expired: ${result.expiredCount}`)

  } catch (error) {
    console.error('[OTC EXPIRATION ERROR]', error)
  }
}
