import { prisma } from "../src/lib/prisma"

async function seed(){

  await prisma.kixikilaGroup.createMany({

    data:[

      {
        name:"Grupo A",
        contribution:20000,
        membersLimit:10,
        cycleMonths:10
      },

      {
        name:"Grupo B",
        contribution:100000,
        membersLimit:15,
        cycleMonths:15
      },

      {
        name:"Grupo C",
        contribution:50000,
        membersLimit:20,
        cycleMonths:20
      }

    ]

  })

  console.log("Kixikila groups created")

}

seed()