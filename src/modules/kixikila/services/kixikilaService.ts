import { prisma } from "../../../lib/prisma"



export const createGroup = async (data:any) => {

  return prisma.kixikilaGroup.create({
    data:{
      ...data,
      status:"OPEN"
    }
  })

}



export const getGroups = async () => {

  const groups = await prisma.kixikilaGroup.findMany({

    include:{
      members:true
    },

    where:{
      status:"OPEN"
    }

  })

  return groups.map(group=>{

    const filled = group.members.length

    return{

      id:group.id,
      name:group.name,
      contribution:Number(group.contribution),
      membersLimit:group.membersLimit,

      filled,

      totalReceive:
        Number(group.contribution) * group.membersLimit

    }

  })

}



export const requestJoin = async (userId:number, groupId:string) => {

  const group = await prisma.kixikilaGroup.findUnique({

    where:{ id:groupId },

    include:{
      members:true
    }

  })

  if(!group)
    throw new Error("Grupo não encontrado")



  const filled = group.members.length

  if(filled >= group.membersLimit)
    throw new Error("Grupo cheio")



  const alreadyMember =
    await prisma.kixikilaMember.findFirst({
      where:{ userId }
    })

  if(alreadyMember)
    throw new Error("Usuário já participa de uma Kixikila")



  const alreadyRequested =
    await prisma.kixikilaRequest.findFirst({

      where:{
        userId,
        groupId,
        status:"PENDING"
      }

    })

  if(alreadyRequested)
    throw new Error("Pedido já enviado")



  return prisma.kixikilaRequest.create({

    data:{
      userId,
      groupId,
      status:"PENDING"
    }

  })

}



export const approveRequest = async (
  requestId:number,
  position:number
) => {

  const request = await prisma.kixikilaRequest.findUnique({

    where:{ id:requestId },

    include:{
      group:true
    }

  })

  if(!request)
    throw new Error("Pedido não encontrado")



  const membersCount =
    await prisma.kixikilaMember.count({
      where:{ groupId:request.groupId }
    })

  if(membersCount >= request.group.membersLimit)
    throw new Error("Grupo já está cheio")



  const existingPosition =
    await prisma.kixikilaMember.findFirst({

      where:{
        groupId:request.groupId,
        position
      }

    })

  if(existingPosition)
    throw new Error("Posição já ocupada")



  const contribution = request.group.contribution



  return prisma.$transaction([

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
        frozenBalance:{
          increment: contribution
        },

        balance:{
          decrement: contribution
        }
      }

    })

  ])

}