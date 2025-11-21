import { Router, Request, Response } from "express";
import Sample from "../lab models/Sample";
import Finance from "../lab models/Finance";
import Test from "../lab models/Test";
import { logAudit } from "../lab utils/audit";

const router = Router();

// GET /finance/income  -> total income from Sample.totalAmount (optionally per month)
router.get("/income", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Sum using totalAmount; if it's 0/missing, compute from referenced test prices
    const result = await Sample.aggregate([
      { $match: { status: { $in: ["received", "processing", "completed", "paid", "finalized"] } } },
      { $lookup: { from: "tests", localField: "tests", foreignField: "_id", as: "testDocs" } },
      { $addFields: {
          computedAmount: {
            $cond: [
              { $gt: ["$totalAmount", 0] },
              "$totalAmount",
              { $reduce: { input: "$testDocs", initialValue: 0, in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] } } }
            ]
          }
        }
      },
      { $group: { _id: null, totalIncome: { $sum: "$computedAmount" } } }
    ]);
    const totalIncome = result.length ? result[0].totalIncome : 0;
    res.json({ totalIncome });
  } catch (err) {
    console.error("Failed to fetch income", err);
    res.status(500).json({ message: "Failed to calculate income" });
  }
});

// POST /finance/recompute-sample-amounts -> recompute totalAmount for existing samples
router.post("/recompute-sample-amounts", async (req: Request, res: Response): Promise<void> => {
  try {
    const samples = await Sample.find();
    let updated = 0;
    for (const s of samples) {
      // Only recompute if amount is missing or zero and tests exist
      if ((!s.totalAmount || s.totalAmount === 0) && Array.isArray((s as any).tests) && (s as any).tests.length) {
        const testDocs = await Test.find({ _id: { $in: (s as any).tests } });
        const newAmount = testDocs.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
        if (newAmount !== s.totalAmount) {
          (s as any).totalAmount = newAmount;
          await s.save();
          updated++;
        }
      }
    }
    await logAudit(req, "recompute_sample_amounts", "LabFinance", { updated });
    res.json({ message: "Recomputed sample amounts", updated });
  } catch (err) {
    console.error("Failed to recompute sample amounts", err);
    res.status(500).json({ message: "Failed to recompute sample amounts" });
  }
});

// Create a new expense
router.post("/expense", async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, description, amount, reference } = req.body;
    if (!category || !description || !amount) {
      res.status(400).json({ message: "category, description and amount are required" });
      return;
    }
    const newExpense = new Finance({
      type: "expense",
      category,
      description,
      amount,
      reference
    });
    await newExpense.save();
    await logAudit(req, "create_expense", "LabFinance", {
      id: (newExpense as any)._id,
      category,
      amount,
      reference,
    });
    res.status(201).json(newExpense);
  } catch (err) {
    console.error("Failed to create expense", err);
    res.status(500).json({ message: "Failed to create expense" });
  }
});

// Get all expenses (optional query by month/year later)
router.get("/expenses", async (_req: Request, res: Response): Promise<void> => {
  try {
    const expenses = await Finance.find({ type: { $regex: /^expense$/i } }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// Get combined recent transactions (income from samples + expenses)
router.get("/transactions", async (_req: Request, res: Response): Promise<void> => {
  try {
    let incomes: Array<{ id: any; type: 'income'; category: string; description: string; amount: number; date: Date; reference?: any; }> = [];
    try {
      // Use aggregation to compute amount from tests when totalAmount is 0/missing
      const sampleAgg = await Sample.aggregate([
        { $lookup: { from: "tests", localField: "tests", foreignField: "_id", as: "testDocs" } },
        { $addFields: {
            amount: {
              $cond: [
                { $gt: ["$totalAmount", 0] },
                "$totalAmount",
                { $reduce: { input: "$testDocs", initialValue: 0, in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] } } }
              ]
            }
          }
        },
        { $project: { _id: 1, createdAt: 1, patientName: 1, amount: 1 } },
        { $sort: { createdAt: -1 } }
      ]);

      incomes = sampleAgg.map((s: any) => ({
        id: s._id,
        type: "income" as const,
        category: "Test Revenue",
        description: `Lab Test - Patient: ${s.patientName || "Unknown"}`,
        amount: Number(s.amount || 0),
        date: new Date(s.createdAt),
        reference: s._id
      }));
    } catch (e) {
      // If income aggregation fails, continue with empty incomes
      incomes = [];
    }

    let expenseMapped: Array<{ id: any; type: 'expense'; category: string; description: string; amount: number; date: Date; reference?: any; }> = [];
    try {
      const expenses = await Finance.find({ type: { $regex: /^expense$/i } }).sort({ date: -1 });
      expenseMapped = expenses.map((e: any) => ({
        id: e._id,
        type: "expense" as const,
        category: e.category,
        description: e.description,
        amount: Number(e.amount || 0),
        date: new Date((e as any).date || (e as any).createdAt),
        reference: e.reference
      }));
    } catch (e) {
      expenseMapped = [];
    }

    const combined = [...incomes, ...expenseMapped].sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());
    res.json(combined);
  } catch (err) {
    console.error("Failed to fetch transactions", err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

export default router;
