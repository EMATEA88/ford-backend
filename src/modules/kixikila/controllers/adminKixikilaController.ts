import { Request, Response } from "express"
import { prisma } from "../../../lib/prisma"

export const createGroup = async (req: Request, res: Response) => {

  try {

    const { name, contribution, membersLimit, cycleMonths } = req.body

    const group = await prisma.kixikilaGroup.create({
      data:{
        name,
        contribution,
        membersLimit,
        cycleMonths,
        status:"OPEN"
      }
    })

    res.json(group)

  } catch {

    res.status(500).json({
      error:"Erro ao criar grupo"
    })

  }

}



export const listGroups = async (req: Request, res: Response) => {

  const groups = await prisma.kixikilaGroup.findMany({

    include:{
      members:true
    },

    orderBy:{
      createdAt:"desc"
    }

  })

  const formatted = groups.map(group=>{

    const filled = group.members.length

    const status =
      filled >= group.membersLimit
        ? "FULL"
        : "OPEN"

    return{

      id:group.id,
      name:group.name,
      contribution:group.contribution,
      membersLimit:group.membersLimit,
      cycleMonths:group.cycleMonths,

      filled,
      status

    }

  })

  res.json(formatted)

}



export const approveMember = async (req: Request, res: Response) => {

  const { requestId, position } = req.body

  const request = await prisma.kixikilaRequest.findUnique({
    where:{ id:requestId },
    include:{ group:true }
  })

  if(!request){
    return res.status(404).json({
      error:"Pedido não encontrado"
    })
  }

  const membersCount = await prisma.kixikilaMember.count({
    where:{ groupId:request.groupId }
  })

  if(membersCount >= request.group.membersLimit){

    return res.status(400).json({
      error:"Grupo já está cheio"
    })

  }

  const contribution = request.group.contribution

  const existingPosition =
    await prisma.kixikilaMember.findFirst({
      where:{
        groupId:request.groupId,
        position
      }
    })

  if(existingPosition){

    return res.status(400).json({
      error:"Posição já ocupada"
    })

  }

  await prisma.$transaction([

    prisma.kixikilaRequest.update({
      where:{ id:requestId },
      data:{ status:"APPROVED" }
    }),

    prisma.kixikilaMember.create({

      data:{
        userId:request.userId,
        groupId:request.groupId,
        position,
        contribution,
        frozenAmount:contribution,
        totalToReceive:
          contribution.mul(request.group.membersLimit),
        status:"ACTIVE"
      }

    }),

    prisma.user.update({

      where:{ id:request.userId },

      data:{
        balance:{
          decrement: contribution
        },
        frozenBalance:{
          increment: contribution
        }
      }

    })

  ])

  res.json({
    success:true
  })

}



export const payMember = async (req: Request, res: Response) => {

  const { memberId } = req.body

  const member = await prisma.kixikilaMember.findUnique({

    where:{ id:memberId },

    include:{
      group:true
    }

  })

  if(!member){

    return res.status(404).json({
      error:"Membro não encontrado"
    })

  }

  if(Number(member.totalReceived) > 0){

    return res.status(400).json({
      error:"Já foi pago"
    })

  }

  const total =
    Number(member.contribution) *
    member.group.membersLimit

  await prisma.$transaction([

    prisma.user.update({

      where:{ id:member.userId },

      data:{
        balance:{
          increment: total
        },
        frozenBalance:{
          decrement: member.contribution
        }

      }

    }),

    prisma.kixikilaMember.update({

      where:{ id:memberId },

      data:{
        totalReceived: total,
        status:"COMPLETED"
      }

    })

  ])

  res.json({

    message:"Pagamento realizado",
    amount: total

  })

}

/* =========================
   LISTAR PEDIDOS DE ENTRADA
========================= */

export const listRequests = async (req: Request, res: Response) => {

  const requests = await prisma.kixikilaRequest.findMany({

    where:{
      status:"PENDING"
    },

    include:{

      user:{
        select:{
          id:true,
          fullName:true,
          publicId:true
        }
      },

      group:{
        select:{
          id:true,
          name:true,
          contribution:true
        }
      }

    },

    orderBy:{
      id:"desc"
    }

  })

  res.json(requests)

}

/* =========================
   EDITAR GRUPO
========================= */

export const updateGroup = async (req: Request, res: Response) => {

  const { id } = req.params
  const { name, contribution, membersLimit, cycleMonths } = req.body

  const group = await prisma.kixikilaGroup.update({
    where:{ id },
    data:{
      name,
      contribution,
      membersLimit,
      cycleMonths
    }
  })

  res.json(group)

}


/* =========================
   REMOVER GRUPO
========================= */

export const deleteGroup = async (req: Request, res: Response) => {

  const { id } = req.params

  const members = await prisma.kixikilaMember.count({
    where:{ groupId:id }
  })

  if(members > 0){

    return res.status(400).json({
      error:"Não é possível remover grupo com membros"
    })

  }

  await prisma.kixikilaGroup.delete({
    where:{ id }
  })

  res.json({
    success:true
  })

}