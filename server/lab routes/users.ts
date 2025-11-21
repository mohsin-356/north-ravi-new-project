import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import * as bcrypt from "bcryptjs";
import LabUser from "../lab models/User";
import { logAudit } from "../lab utils/audit";

const router = Router();

// Normalize role to backend canonical form
const normalizeRole = (role?: string) => {
  if (!role) return role;
  return role === "lab-technician" ? "labTech" : role;
};

// List users
const listHandler = async (_req: any, res: any) => {
  try {
    const users = await LabUser.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    console.error("[lab/users] list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create user
const createHandler = async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    let { username, password, role } = req.body as { username: string; password: string; role: string };
    role = normalizeRole(role) as string;
    const existing = await LabUser.findOne({ username });
    if (existing) return res.status(409).json({ message: "User exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await LabUser.create({ username, passwordHash, role });
    await logAudit(req, "create_user", "LabUser", { targetUsername: username, role });
    res.status(201).json({ id: user._id });
  } catch (err) {
    console.error("[lab/users] create error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user (email/role/password)
const updateHandler = async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params as { id: string };
    let { role, password } = req.body as { role?: string; password?: string };
    role = normalizeRole(role) as string;
    const update: any = {};
    if (role !== undefined) update.role = role;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    const prev = await LabUser.findByIdAndUpdate(id, update, { new: true });
    if (!prev) return res.status(404).json({ message: "Not found" });
    await logAudit(req, "update_user", "LabUser", { id, role, changedPassword: Boolean(password) });
    res.json({ ok: true });
  } catch (err) {
    console.error("[lab/users] update error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete user
const deleteHandler = async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params as { id: string };
    const user = await LabUser.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "Not found" });
    await logAudit(req, "delete_user", "LabUser", { id, username: (user as any).username });
    res.json({ ok: true });
  } catch (err) {
    console.error("[lab/users] delete error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

router.get("/", listHandler);
router.post(
  "/",
  [
    body("username").isLength({ min: 3 }),
    body("password").isLength({ min: 3 }),
    body("role").isIn(["lab-technician", "labTech", "receptionist", "researcher"]),
  ],
  createHandler
);
router.put(
  "/:id",
  [
    param("id").isString(),
    body("role").optional().isIn(["lab-technician", "labTech", "receptionist", "researcher"]),
    body("password").optional().isLength({ min: 3 }),
  ],
  updateHandler
);
router.delete("/:id", [param("id").isString()], deleteHandler);

export default router;
