import cron from "node-cron"
import { prisma } from "../lib/prisma"



export const startKixikilaJob = () => {

  cron.schedule("0 2 * * *", async () => {

    console.log("Executando cobrança Kixikila...")

    const today = new Date()

    const payments = await prisma.kixikilaPayment.findMany({
      where:{
        status:"PENDING",
        dueDate:{
          lte:today
        }
      },
      include:{
        user:true,
        group:true,
        member:true
      }
    })

    for(const payment of payments){

      const user = payment.user
      const contribution = Number(payment.amount)

      if(Number(user.balance) >= contribution){

        await prisma.$transaction([

          prisma.user.update({
            where:{ id:user.id },
            data:{
              balance:{ decrement: contribution }
            }
          }),

          prisma.kixikilaPayment.update({
            where:{ id:payment.id },
            data:{
              status:"PAID",
              paidAt:new Date()
            }
          })

        ])

      }else{

        const penalty = contribution * 0.05

        await prisma.kixikilaPayment.update({
          where:{ id:payment.id },
          data:{
            penalty,
            status:"LATE"
          }
        })

        await prisma.user.update({
          where:{ id:user.id },
          data:{
            balance:{ decrement: penalty }
          }
        })

      }

    }


  })

}