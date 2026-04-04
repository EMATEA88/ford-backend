import { prisma } from "../lib/prisma"
import {
  ApplicationStatus,
  TransactionType,
  LedgerType,
  Prisma
} from "@prisma/client"

export async function applicationMaturityJob(){

  try{

    const now = new Date()

    const apps = await prisma.application.findMany({
      where:{
        status: ApplicationStatus.ACTIVE,
        maturityDate:{ lte: now }
      }
    })

    console.log("🔍 Checking applications...")
    console.log("Found:", apps.length)

    for(const app of apps){

      await prisma.$transaction(async(tx)=>{

        const fresh = await tx.application.findUnique({
          where:{ id: app.id }
        })

        if(!fresh || fresh.status !== ApplicationStatus.ACTIVE)
          return

        const amount = new Prisma.Decimal(fresh.amount)
        const totalReturn = new Prisma.Decimal(fresh.totalReturn)

        const user = await tx.user.findUnique({
          where:{ id: fresh.userId }
        })

        const currentBalance = new Prisma.Decimal(user!.balance)
        const newBalance = currentBalance.add(totalReturn)

        await tx.user.update({
          where:{ id: fresh.userId },
          data:{
            frozenBalance:{ decrement: amount },
            balance:{ increment: totalReturn }
        }
            
        })

        await tx.application.update({
          where:{ id: fresh.id },
          data:{
            status: ApplicationStatus.MATURED,
            redeemedAt: new Date()
          }
        })

        await tx.transaction.create({
          data:{
            userId: fresh.userId,
            type: TransactionType.INVESTMENT_CREDIT,
            amount: totalReturn
          }
        })

        await tx.ledgerEntry.create({
          data:{
            userId: fresh.userId,
            type: LedgerType.CREDIT,
            amount: totalReturn,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reference:`INV-MATURE-${fresh.id}`,
            description:"Investment matured"
          }
        })

      })

    }

    if(apps.length > 0){
      console.log(`🟢 Applications matured: ${apps.length}`)
    }

  }catch(error){

    console.error("❌ Application maturity job error:", error)

  }

}