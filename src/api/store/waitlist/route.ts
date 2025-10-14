// src/api/store/waitlist/route.ts
import type { Request, Response } from "express"

export const POST = async (req: Request, res: Response) => {
  try {
    const { email, campaign = "drop-001" } = req.body || {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email" })
    }

    const r = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        email,
        listIds: [Number(process.env.BREVO_LIST_ID)], // set in env
        updateEnabled: true,
        attributes: { SOURCE: "LandingPage", CAMPAIGN: campaign },
      }),
    })

    const data = await r.json()
    if (!r.ok) return res.status(r.status).json(data)

    // (optional) mirror to DB here …

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ message: "Server error" })
  }
}
