import { Router, Request, Response } from "express";
import Setting from "../lab models/Setting";
import { logAudit } from "../lab utils/audit";

const router = Router();

// Only authenticated lab technicians (or admin role) can view/update settings
// import { verifyJWT, authorizeRoles } from "../middleware/auth";
// router.use(verifyJWT, authorizeRoles(["labTechnician", "admin"]));

// Get current settings
router.get("/", async (_req: Request, res: Response) => {
  try {
    const setting: any = await Setting.findOne();
    if (setting?.pricing) {
      // Back-compat field for older UIs expecting bulkDiscountRate
      const p = setting.pricing as any;
      if (p.discountRate != null && p.bulkDiscountRate == null) {
        p.bulkDiscountRate = p.discountRate;
      }
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Update or create settings (upsert)
router.put("/", async (req: Request, res: Response) => {
  try {
    // Sanitize and map incoming body to new schema
    const body = req.body || {};
    const lab = body.lab || {};
    const pricingIn = body.pricing || {};
    const regional = body.regional || {};
    const notifications = body.notifications || {};
    const backup = body.backup || undefined;

    const pricing = {
      defaultCurrency: pricingIn.defaultCurrency,
      taxRate: pricingIn.taxRate,
      // Prefer new field but support old bulkDiscountRate
      discountRate: pricingIn.discountRate != null ? pricingIn.discountRate : pricingIn.bulkDiscountRate,
    };

    const updateDoc: any = {
      lab: {
        labName: lab.labName,
        address: lab.address,
        phone: lab.phone,
        email: lab.email,
        website: lab.website,
        license: lab.license,
      },
      pricing,
      regional: {
        timezone: regional.timezone,
        defaultLanguage: regional.defaultLanguage,
      },
      notifications,
    };
    if (backup) updateDoc.backup = backup;

    const updated = await Setting.findOneAndUpdate({}, updateDoc, {
      new: true,
      upsert: true,
      runValidators: true,
    });
    try {
      await logAudit(req as any, "update_settings", "LabSettings", {
        labName: updateDoc?.lab?.labName,
        hasPricing: !!updateDoc?.pricing,
      });
    } catch {}
    // Mirror field for backward compatibility in response
    const resp: any = updated?.toObject ? updated.toObject() : updated;
    if (resp?.pricing) {
      if (resp.pricing.discountRate != null) {
        resp.pricing.bulkDiscountRate = resp.pricing.discountRate;
      }
      // Strip removed fields if they exist
      delete resp.pricing.discountThreshold;
      delete resp.pricing.emergencyCharges;
      delete resp.pricing.homeCollectionCharges;
    }
    res.json(resp);
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

export default router;
