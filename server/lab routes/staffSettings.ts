import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import StaffSetting from "../lab models/StaffSetting";

const router = Router();

// import { verifyJWT, authorizeRoles } from "../middleware/auth";
//// router.use(verifyJWT, authorizeRoles(["labTech"])); // adjust role as needed

// List all settings
router.get("/", async (_req: Request, res: Response) => {
  const settings = await StaffSetting.find();
  res.json(settings);
});

// Get by key
router.get("/:key", async (req: Request, res: Response) => {
  const setting = await StaffSetting.findOne({ key: req.params.key });
  if (!setting) {
    // Return a sensible default instead of 404 so UI can initialize settings
    res.json({ key: req.params.key, value: {}, description: "" });
    return;
  }
  res.json(setting);
  return;
});

// Upsert setting
router.put(
  "/:key",
  [body("value").not().isEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const updated = await StaffSetting.findOneAndUpdate(
        { key: req.params.key },
        { value: req.body.value, description: req.body.description },
        { new: true, upsert: true }
      );
      res.json(updated);
      return;
    } catch (err) {
      res.status(500).json({ message: "Failed to save setting" });
      return;
    }
  }
);

export default router;
