import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getXpAmount } from '@/lib/award-xp'
import { mirrorXpToAdmin } from '@/lib/admin-xp'
import Anthropic from '@anthropic-ai/sdk'

const WINE_PROMPT = `You are a world-class sommelier and wine label expert. Analyze this wine bottle image and identify the wine with maximum precision.

Identification priority:
1. LABEL TEXT: Read every visible word — brand name, winery, varietal, vintage year, region, appellation, ABV percentage
2. LABEL DESIGN: Recognize distinctive brand designs (Stella Rosa multicolor design, Yellow Tail kangaroo, Barefoot foot logo, Juggernaut dark skull-like label, Llano Estacado Texas branding, 19 Crimes mugshot labels, Bread & Butter, Santa Margherita Pinot Grigio, Bogle, Apothic, Meiomi, Josh Cellars, Kim Crawford, La Marca Prosecco, Matua, Ménage à Trois, The Prisoner, Kendall-Jackson, Chateau Ste. Michelle, Cupcake Vineyards)
3. BOTTLE CHARACTERISTICS: Bottle silhouette, glass color (green, clear, dark), capsule foil style, bottle shape

Return ONLY a valid JSON object — no markdown, no explanation, no code blocks:
{
  "wineName": "Full wine name exactly as shown on label",
  "winery": "Producer or winery name",
  "varietal": "Grape variety or blend description",
  "region": "Wine region and country",
  "vintage": "4-digit year if visible on label, otherwise null",
  "style": "Exactly one of: Sweet Red, Dry Red, Bold Red, Crisp White, Sweet White, Rosé, Sparkling, Dessert, Unknown",
  "abv": "ABV percentage if visible (e.g. '13.5%'), otherwise estimated range like '12-13%'",
  "tastingNotes": "3 vivid sentences on aroma, flavor profile, and finish — be specific and evocative",
  "flavorNotes": ["Flavor 1", "Flavor 2", "Flavor 3", "Flavor 4", "Flavor 5", "Flavor 6"],
  "pairings": ["🥩 Food name", "🍫 Food name", "🧀 Food name", "🌿 Food name", "🍝 Food name"],
  "confidence": "high if label text clearly readable, medium if partially visible or recognized by brand design, low if mostly inferring from bottle characteristics",
  "identificationMethod": "label_text if you read clear label text, label_design if recognized brand/logo, visual_inference otherwise"
}

For flavorNotes: provide 5-7 short descriptors (1-3 words each) of actual tasting/aroma notes — e.g. "Blackberry", "Toasted Oak", "Dark Chocolate", "Spiced Plum", "Vanilla Bean", "Dried Cherry", "Black Pepper", "Citrus Zest", "Tropical Fruit", "Stone Fruit", "Leather", "Earthy", "Floral", "Mineral".`

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Wine identification not configured. Add ANTHROPIC_API_KEY to environment variables.' }, { status: 503 })
  }

  try {
    const { imageData } = await req.json()

    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 })
    }

    const match = imageData.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid image format. Please upload a JPG, PNG, or WebP.' }, { status: 400 })
    }
    const [, rawMediaType, base64Data] = match
    const mediaType = (rawMediaType === 'image/jpg' ? 'image/jpeg' : rawMediaType) as
      'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1280,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          { type: 'text', text: WINE_PROMPT },
        ],
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    let wineData: Record<string, unknown>
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      wineData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    } catch {
      return NextResponse.json({ error: 'Could not parse wine data from AI response.' }, { status: 500 })
    }

    const db = prisma as any

    const identification = await db.wineIdentification.create({
      data: {
        userId: session.user.id,
        imageData,
        wineName:    String(wineData.wineName || 'Unknown Wine').slice(0, 200),
        winery:      wineData.winery      ? String(wineData.winery).slice(0, 200)   : null,
        varietal:    wineData.varietal    ? String(wineData.varietal).slice(0, 200) : null,
        region:      wineData.region      ? String(wineData.region).slice(0, 200)   : null,
        vintage:     wineData.vintage     ? String(wineData.vintage).slice(0, 10)   : null,
        style:       wineData.style       ? String(wineData.style).slice(0, 50)     : null,
        abv:         wineData.abv         ? String(wineData.abv).slice(0, 20)       : null,
        tastingNotes: wineData.tastingNotes ? String(wineData.tastingNotes) : null,
        pairings:    JSON.stringify(Array.isArray(wineData.pairings)    ? wineData.pairings.slice(0, 8)    : []),
        flavorNotes: JSON.stringify(Array.isArray(wineData.flavorNotes) ? wineData.flavorNotes.slice(0, 8) : []),
        confidence:  String(wineData.confidence || 'medium'),
      },
    })

    // Award PHOTO_UPLOAD XP once per day
    const today = new Date().toISOString().slice(0, 10)
    const existingToday = await db.xpEvent.count({
      where: { userId: session.user.id, eventType: 'PHOTO_UPLOAD', date: today },
    })

    let xpAwarded = 0
    if (existingToday === 0 && !session.user.superAdmin) {
      const xpAmount = await getXpAmount('PHOTO_UPLOAD')
      await prisma.userSkill.update({
        where: { userId_skill: { userId: session.user.id, skill: 'FOOD' } },
        data: { xp: { increment: xpAmount } },
      })
      await db.xpEvent.create({
        data: { userId: session.user.id, eventType: 'PHOTO_UPLOAD', eventKey: '', amount: xpAmount, date: today },
      })
      await mirrorXpToAdmin('FOOD', xpAmount, session.user.id)
      xpAwarded = xpAmount
    }

    return NextResponse.json({
      success: true,
      id: identification.id,
      xpAwarded,
      wine: {
        wineName:             String(wineData.wineName || 'Unknown Wine'),
        winery:               wineData.winery      ? String(wineData.winery)      : undefined,
        varietal:             wineData.varietal    ? String(wineData.varietal)    : undefined,
        region:               wineData.region      ? String(wineData.region)      : undefined,
        vintage:              wineData.vintage     ? String(wineData.vintage)     : undefined,
        style:                wineData.style       ? String(wineData.style)       : undefined,
        abv:                  wineData.abv         ? String(wineData.abv)         : undefined,
        tastingNotes:         wineData.tastingNotes ? String(wineData.tastingNotes) : undefined,
        flavorNotes:          Array.isArray(wineData.flavorNotes) ? wineData.flavorNotes.map(String) : [],
        pairings:             Array.isArray(wineData.pairings)    ? wineData.pairings.map(String)    : [],
        confidence:           String(wineData.confidence || 'medium'),
        identificationMethod: wineData.identificationMethod ? String(wineData.identificationMethod) : undefined,
      },
    })
  } catch (error) {
    console.error('Wine identify error:', error)
    return NextResponse.json({ error: 'Failed to identify wine. Please try again.' }, { status: 500 })
  }
}
