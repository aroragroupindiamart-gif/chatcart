import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getWAState } from "../lib/whatsapp.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  const wa = getWAState();
  res.json({
    ...data,
    wa: {
      status: wa.status,
      phone: wa.phone,
      connectedAt: wa.connectedAt,
      disconnectedAt: wa.disconnectedAt,
    },
  });
});

export default router;
