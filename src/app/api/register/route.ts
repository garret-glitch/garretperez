import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SkillType } from '@prisma/client'

const ALL_SKILLS = Object.values(SkillType)

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required.' }, { status: 400 })
    }
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Username must be 3–20 characters.' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username: letters, numbers, underscores only.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: {
        username,
        passwordHash,
        skills: {
          create: ALL_SKILLS.map(skill => ({ skill })),
        },
      },
    })

    // Award Garret XP for each new member joining
    try {
      const randomSkill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)]
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
      if (admin) {
        await prisma.userSkill.update({
          where: { userId_skill: { userId: admin.id, skill: randomSkill } },
          data: { xp: { increment: 25 } },
        })
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 })
  }
}
