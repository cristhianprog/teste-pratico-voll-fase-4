import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  return res.status(200).json({ ok: true, received: body });
}