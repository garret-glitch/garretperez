// Run: node scripts/add-test-plant.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the Tomato plant type
  const tomato = await prisma.gardenPlantType.findFirst({ where: { name: 'Tomato' } })
  if (!tomato) { console.error('Tomato type not found — run seed script first'); process.exit(1) }

  const plant = await prisma.gardenYardPlant.create({
    data: {
      name: 'Cherry Tomatoes',
      plantTypeId: tomato.id,
      growthStage: 3,           // "Growing" stage
      xPos: 35,                 // left-center of yard
      yPos: 45,
      datePlanted: new Date(Date.now() - 28 * 86400000), // planted 28 days ago
      notes: 'Started from seed indoors. Transplanted out after last frost. Looking healthy!',
      isAutoGrowth: true,       // will auto-advance based on tomato type autoGrowthDays
      harvestStatus: false,
      photos: '[]',
      addedBy: 'Garret',
    },
    include: { plantType: true },
  })

  console.log(`✓ Added: ${plant.plantType?.icon} ${plant.name}`)
  console.log(`  Stage: ${plant.growthStage} (Growing)`)
  console.log(`  Position: ${plant.xPos}%, ${plant.yPos}%`)
  console.log(`  Planted: ${plant.datePlanted?.toLocaleDateString()}`)
  console.log(`  Auto-growth: every ${plant.plantType?.autoGrowthDays} days per stage`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
