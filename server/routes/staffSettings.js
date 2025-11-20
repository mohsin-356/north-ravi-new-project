const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const StaffSetting = require('../models/StaffSetting');

const router = Router();

// Optionally enable auth
// const { verifyJWT, authorizeRoles } = require('../middleware/auth');
// router.use(verifyJWT, authorizeRoles(['labTech']));

// List all settings
router.get('/', async (_req, res) => {
  const settings = await StaffSetting.find();
  return res.json(settings);
});

// Get by key
router.get('/:key', async (req, res) => {
  const setting = await StaffSetting.findOne({ key: req.params.key });
  if (!setting) {
    // Return default so UI can initialize
    return res.json({ key: req.params.key, value: {}, description: '' });
  }
  return res.json(setting);
});

// Upsert setting
router.put('/:key', [body('value').not().isEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const updated = await StaffSetting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value, description: req.body.description },
      { new: true, upsert: true }
    );
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save setting' });
  }
});

module.exports = router;
