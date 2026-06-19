import { Router } from "express";
import { db } from "@workspace/db";
import { contactSubmissions } from "@workspace/db/schema";
import { z } from "zod";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  contact: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

router.post("/contact", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, contact, message } = parsed.data;
  await db.insert(contactSubmissions).values({ name, contact, message });
  res.json({ success: true });
});

export default router;
