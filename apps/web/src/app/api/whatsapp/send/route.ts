import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { phone, message, groupId } = await request.json()

  // Integración con WhatsApp Business API via CallMeBot (gratuito para pruebas)
  // o Evolution API (self-hosted) o Twilio
  const wapiKey = process.env.WHATSAPP_API_KEY
  const wapiPhone = process.env.WHATSAPP_PHONE

  if (!wapiKey || !wapiPhone) {
    // Sin API configurada — retornar el mensaje para envío manual
    return NextResponse.json({
      success: false,
      manual: true,
      message,
      whatsappUrl: `https://wa.me/${phone?.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`
    })
  }

  // CallMeBot API (gratis, requiere activación)
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${wapiKey}`
    const res = await fetch(url)
    return NextResponse.json({ success: res.ok, status: res.status })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) })
  }
}
