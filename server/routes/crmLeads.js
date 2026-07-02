const express = require('express');
const { getLeads, updateLeadStage, addNote } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
  .get(getLeads);

router.route('/:id')
  .put(updateLeadStage);

router.route('/:id/notes')
  .post(addNote);

module.exports = router;
