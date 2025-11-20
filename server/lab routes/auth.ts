import { Router } from "express";
import { body, validationResult } from "express-validator";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import User from "../lab models/User";

const router = Router();

// Normalize role to backend canonical form
const normalizeRole = (role?: string) => {
  if (!role) return role;
  return role === "lab-technician" ? "labTech" : role;
};

// Register handler (typed)
const registerHandler = async (req: any, res: any): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    let { username, password, role } = req.body as { username: string; password: string; role: string };
    role = normalizeRole(role) as string;
    const existing = await User.findOne({ username });
    if (existing) { res.status(409).json({ message: "User exists" }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, role });
    res.status(201).json({ id: user._id });
    return;
  } catch (err) {
    console.error('[lab/auth] register error:', err);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

router.post(
  "/register",
  [
    body("username").isLength({ min: 3 }),
    body("password").isLength({ min: 6 }),
    body("role").isIn(["lab-technician", "labTech", "receptionist", "researcher"]),
  ],
  registerHandler
);

// Quick health for mounting verification
router.get("/ping", (_req: any, res: any) => {
  res.json({ ok: true });
});

// Login handler (typed)
const loginHandler = async (req: any, res: any): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    const { username, password } = req.body as { username: string; password: string };
    const user = await User.findOne({ username });
    if (!user) { res.status(401).json({ message: "Invalid credentials" }); return; }
    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) { res.status(401).json({ message: "Invalid credentials" }); return; }
    const token = jwt.sign({ uid: user._id, role: (user as any).role, username: (user as any).username }, process.env.JWT_SECRET || "secret", { expiresIn: "1h" });
    res.json({ token, role: (user as any).role });
    return;
  } catch (err) {
    console.error('[lab/auth] login error:', err);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

router.post(
  "/login",
  [body("username").isLength({ min: 3 }), body("password").exists()],
  loginHandler
);

export default router;
