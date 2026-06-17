import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SkillType, UserRole } from '@prisma/client'

// Never run this DB-touching route at build/export time — always on demand.
export const dynamic = 'force-dynamic'

const ALL_SKILLS = Object.values(SkillType)

// One-time setup: creates the admin account if it doesn't already exist.
// Requires SETUP_ADMIN_USERNAME and SETUP_ADMIN_PASSWORD env vars to be set.
// Visit /api/setup once to create the account, then remove the env vars.
export async function GET() {
  const username = process.env.SETUP_ADMIN_USERNAME
  const password = process.env.SETUP_ADMIN_PASSWORD

  if (!username || !password) {
    return NextResponse.json({ error: 'SETUP_ADMIN_USERNAME and SETUP_ADMIN_PASSWORD env vars are required.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ message: 'Admin account already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: UserRole.ADMIN,
      skills: {
        create: ALL_SKILLS.map(skill => ({ skill })),
      },
    },
  })

  return NextResponse.json({ success: true, message: 'Admin account created.' })
}
