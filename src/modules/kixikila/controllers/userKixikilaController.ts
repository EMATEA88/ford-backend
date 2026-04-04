import { Request, Response } from "express"
import { prisma } from "../../../lib/prisma"



export const getGroups = async (req: Request, res: Response) => {

  const groups = await prisma.kixikilaGroup.findMany({
    include:{ members:true },
    orderBy:{ createdAt:"desc" }
  })

  const formatted = groups.map(group => {

    const filled = group.members.length

    return{
      id:group.id,
      name:group.name,
      contribution:Number(group.contribution),
      membersLimit:group.membersLimit,
      filled,
      cycle:group.membersLimit,
      totalReceive:
        Number(group.contribution) * group.membersLimit
    }

  })

  res.json(formatted)

}



export const getKixikilaDashboard = async (req: Request, res: Response) => {

  if(!req.user){
    return res.status(401).json({ error:"Unauthorized" })
  }

  const userId = req.user.id

  const user = await prisma.user.findUnique({
    where:{ id:userId },
    select:{
      id:true,
      balance:true,
      frozenBalance:true,
      fullName:true
    }
  })

  const groups = await prisma.kixikilaGroup.findMany({
    include:{ members:true },
    orderBy:{ createdAt:"desc" }
  })

  const formattedGroups = groups.map(group => {

    const filled = group.members.length

    return{
      id:group.id,
      name:group.name,
      contribution:Number(group.contribution),
      membersLimit:group.membersLimit,
      filled,
      cycle:group.membersLimit,
      totalReceive:
        Number(group.contribution) * group.membersLimit
    }

  })

  const member = await prisma.kixikilaMember.findFirst({
    where:{ userId },
    include:{ group:true }
  })

  let participation = null

  if(member){

    participation = {
      groupId:member.groupId,
      groupName:member.group.name,
      position:member.position,
      contribution:Number(member.contribution),
      totalReceive:
        Number(member.group.contribution) *
        member.group.membersLimit,
      status:member.status
    }

  }

  res.json({

    wallet:{
      balance:Number(user?.balance || 0),
      frozen:Number(user?.frozenBalance || 0)
    },

    groups:formattedGroups,

    participation

  })

}



export const joinGroup = async (req: Request, res: Response) => {

  if(!req.user){
    return res.status(401).json({ error:"Unauthorized" })
  }

  const userId = req.user.id
  const { groupId } = req.body

  const user = await prisma.user.findUnique({
    where:{ id:userId }
  })

  const group = await prisma.kixikilaGroup.findUnique({
    where:{ id:groupId },
    include:{ members:true }
  })

  if(!group){
    return res.status(404).json({ error:"Grupo não encontrado" })
  }

  if(Number(user!.balance) < Number(group.contribution)){
    return res.status(400).json({ error:"Saldo insuficiente" })
  }

  const alreadyMember = await prisma.kixikilaMember.findFirst({
    where:{ userId }
  })

  if(alreadyMember){
    return res.status(400).json({
      error:"Você já participa de uma Kixikila"
    })
  }

  const alreadyRequested = await prisma.kixikilaRequest.findFirst({
    where:{
      userId,
      groupId,
      status:"PENDING"
    }
  })

  if(alreadyRequested){
    return res.status(400).json({
      error:"Pedido já enviado"
    })
  }

  const filled = group.members.length

  if(filled >= group.membersLimit){
    return res.status(400).json({
      error:"Grupo já está cheio"
    })
  }

  const request = await prisma.kixikilaRequest.create({
    data:{
      userId,
      groupId,
      status:"PENDING"
    }
  })

  res.json(request)

}



/* =========================
   LISTAR MEMBROS DO GRUPO
========================= */

export const getGroupMembers = async (req: Request, res: Response) => {

  const { id } = req.params

  const members = await prisma.kixikilaMember.findMany({

    where:{ groupId:id },

    include:{
      user:{
        select:{
          fullName:true,
          publicId:true
        }
      }
    },

    orderBy:{
      position:"asc"
    }

  })

  res.json(members)

}