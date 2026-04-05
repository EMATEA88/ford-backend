import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import helmet from 'helmet'
import compression from 'compression'

import { apiRateLimit } from './config/rateLimit'
import { errorHandler } from './utils/errorHandler'

// =========================
// AUTH
// =========================
import { authRoutes } from './modules/auth/auth.routes'
import { authMiddleware } from './modules/auth/auth.middleware'

// =========================
// ADMIN MIDDLEWARE
// =========================
import { adminOnly } from './modules/admin/adminOnly'

// =========================
// CONTROLLERS
// =========================
import { UserController } from './modules/user/user.controller'

// =========================
// USER ROUTES
// =========================
import { rechargeRoutes } from './modules/recharge/recharge.routes'
import { withdrawalRoutes } from './modules/withdrawal/withdrawal.routes'
import supportRoutes from './modules/support/support.routes'
import notificationRoutes from './modules/notification/notification.routes'
import { bankRoutes } from './modules/bank/bank.routes'
import { userRoutes } from './modules/user/user.routes'
import userBankRoutes from './modules/userBank/userBank.routes'
import transactionRoutes from './modules/transaction/transaction.routes'
import applicationRoutes from "./modules/aplication/application.route"
import { userOTCRoutes } from "./modules/otc-user/user.otc.routes"
import { userKYCRoutes } from "./modules/kyc/user.kyc.routes"
import kixikilaRoutes from "./modules/kixikila/routes/kixikilaRoutes"
import betRoutes from "./routes/betRoutes";
import referralRoutes from './modules/referral/referral.routes'
import productRoutes from './modules/products/product.routes'
import taskRoutes from './modules/task/task.routes'
import earningsRoutes from './modules/earnings/earnings.routes'
import storeRoutes from './modules/store/store.routes'

// =========================
// SERVICES / FINANCE
// =========================
import { serviceRoutes } from './modules/service/service.route'
import { serviceRefundRoutes } from './modules/service/service-refund.route'
import { settlementRoutes } from './modules/settlement/settlement.route'
import { adminFinanceRoutes } from './modules/admin/admin-finance.route'
import { adminLogRoutes } from './modules/admin/log/admin-log.route'

// =========================
// ADMIN ROUTES
// =========================
import adminDashboardRoutes from './modules/admin/dashboard/admin-dashboard.routes'
import adminUsersRoutes from './modules/admin/users/admin.users.routes'
import adminRechargesRoutes from './modules/admin/recharge/admin.recharges.routes'
import adminWithdrawalsRoutes from './modules/admin/withdrawals/admin.withdrawals.routes'
import adminTransactionsRoutes from './modules/admin/transactions/admin.transactions.routes'
import adminNotificationsRoutes from './modules/admin/notifications/admin.notifications.routes'
import adminCommissionRoutes from './modules/admin/commissions/admin.commission.routes'
import { bankAdminRoutes } from './modules/admin/bank-admin/bank.admin'
import giftRoutes from './modules/gift/gift.routes'
import adminOTCRoutes from './modules/admin/otc/admin.otc.route'
import adminApplicationRoutes from "./modules/admin/applications/admin.application.route"
import adminSettlementRoutes from "./modules/admin/settlements/admin.settlement.route"
import { adminServiceRoutes } from './modules/admin/services/admin.service.routes'
import { adminServiceRefundRoutes } from './modules/admin/service-refund/admin.service-refund.routes'
import { adminRevenueRoutes } from './modules/admin/revenue/admin.revenue.routes'
import adminPartnerRoutes from './modules/admin/partner/admin.partner.routes'
import { adminKYCRoutes } from "./modules/admin/kyc/admin.kyc.routes"

const app = express()

/* =========================
   GLOBAL SECURITY LAYER
========================= */

// 🔒 Remove header X-Powered-By
app.disable('x-powered-by')

// 🔒 Helmet (configuração única)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  })
)

// 🔒 Compression (melhora performance mobile)
app.use(compression())

// 🔒 CORS HARDENED
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ford-admin.onrender.com',
  'https://ford-frontend.onrender.com',
  'https://ematea.org',
  'https://www.ematea.org',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
]

app.options('*', cors())

app.use(
  cors({
    origin: function (origin, callback) {

      if (!origin) return callback(null, true)

      if (origin && allowedOrigins.some(o => origin.startsWith(o))) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-app"
    ]
  })
)

// 🔒 Body limit anti abuse
app.use(express.json({ limit: '1mb' }))

/* =========================
   PUBLIC ROUTES
========================= */

app.use('/auth', apiRateLimit, authRoutes)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

/* =========================
   PROTECTED USER ROUTES
========================= */

app.get('/profile', authMiddleware, UserController.me)
app.get('/users/me', authMiddleware, UserController.me)

app.use('/recharges', authMiddleware, apiRateLimit, rechargeRoutes)
app.use('/withdrawals', authMiddleware, apiRateLimit, withdrawalRoutes)

app.use(
  '/services',
  authMiddleware,
  apiRateLimit,
  serviceRoutes,
  serviceRefundRoutes
)

app.use('/notifications', authMiddleware, apiRateLimit, notificationRoutes)
app.use('/support', authMiddleware, apiRateLimit, supportRoutes)
app.use('/bank', authMiddleware, apiRateLimit, bankRoutes)
app.use('/users', authMiddleware, apiRateLimit, userRoutes)
app.use('/user-bank', authMiddleware, apiRateLimit, userBankRoutes)
app.use('/transactions', authMiddleware, apiRateLimit, transactionRoutes)
app.use('/applications', authMiddleware, apiRateLimit, applicationRoutes)
app.use('/gift', authMiddleware, giftRoutes)
app.use("/kixikila", kixikilaRoutes)
app.use("/bets", authMiddleware, betRoutes);
app.use('/referral', authMiddleware, referralRoutes)
app.use('/products', authMiddleware, productRoutes)
app.use('/task', taskRoutes)
app.use('/earnings', earningsRoutes)
app.use('/store', storeRoutes)

app.use('/otc', authMiddleware, userOTCRoutes)
app.use('/kyc', authMiddleware, userKYCRoutes)

/* =========================
   STATIC
========================= */

app.use(
  '/uploads',
  express.static(path.resolve('uploads'), {
    maxAge: '7d',
    etag: true,
    immutable: true
  })
)

/* =========================
   ADMIN ROUTES
========================= */

function adminSecure(route: string, router: any) {
  app.use(route, authMiddleware, adminOnly, apiRateLimit, router)
}

adminSecure('/admin/dashboard', adminDashboardRoutes)
adminSecure('/admin/users', adminUsersRoutes)
adminSecure('/admin/recharges', adminRechargesRoutes)
adminSecure('/admin/withdrawals', adminWithdrawalsRoutes)
adminSecure('/admin/transactions', adminTransactionsRoutes)
adminSecure('/admin/notifications', adminNotificationsRoutes)
adminSecure('/admin/commissions', adminCommissionRoutes)
adminSecure('/admin/bank-admin', bankAdminRoutes)
adminSecure('/admin/gift', giftRoutes)
adminSecure('/admin/otc', adminOTCRoutes)
adminSecure('/admin/applications', adminApplicationRoutes)
adminSecure('/admin/settlements', adminSettlementRoutes)
adminSecure('/admin/services', adminServiceRoutes)
adminSecure('/admin/service-refunds', adminServiceRefundRoutes)
adminSecure('/admin/revenue', adminRevenueRoutes)
adminSecure('/admin/partners', adminPartnerRoutes)
adminSecure('/admin/kyc', adminKYCRoutes)
adminSecure('/admin/finance', adminFinanceRoutes)
adminSecure('/admin/logs', adminLogRoutes)

/* =========================
   ERROR HANDLER
========================= */

app.use(errorHandler)

export default app