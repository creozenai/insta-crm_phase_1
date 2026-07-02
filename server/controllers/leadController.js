const Lead = require('../models/Lead');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update lead details (status, priority, etc)
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLeadStage = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }



    if (req.body.status && req.body.status !== lead.status) {
      const pipelineOrder = {
        'New': 1,
        'Not Picking': 2,
        'Contacted': 3,
        'Following Up': 4,
        'Payment Pending': 5,
        'Won': 6,
        'Lost': 6,
        'Not Contacted': 2,
        'Interested': 5,
        'Rejected': 6
      };
      
      const oldIndex = pipelineOrder[lead.status] || 0;
      const newIndex = pipelineOrder[req.body.status] || 0;
      
      if (oldIndex > 0 && newIndex > 0 && newIndex < oldIndex) {
        return res.status(400).json({ success: false, error: 'Lead status progression must move forward.' });
      }
      if (!req.body.newNote || !req.body.newNote.trim()) {
        return res.status(400).json({ success: false, error: 'A note is mandatory when changing the lead status.' });
      }
    }

    const { newNote, notes, statusHistory, ...otherUpdates } = req.body;
    const updateQuery = { $set: otherUpdates };

    if (req.body.status && req.body.status !== lead.status) {
      updateQuery.$push = updateQuery.$push || {};
      updateQuery.$push.statusHistory = {
        status: req.body.status,
        timestamp: new Date()
      };
    }

    if (newNote && newNote.trim()) {
      updateQuery.$push = updateQuery.$push || {};
      updateQuery.$push.notes = {
        $each: [{
          text: newNote.trim(),
          status: req.body.status || lead.status,
          createdBy: req.user ? req.user._id : null,
          createdAt: new Date()
        }],
        $position: 0
      };
    }

    lead = await Lead.findByIdAndUpdate(req.params.id, updateQuery, { new: true });

    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add a note to a lead
// @route   POST /api/leads/:id/notes
// @access  Private
exports.addNote = async (req, res) => {
  try {
    const { newNote } = req.body;
    
    if (!newNote || !newNote.trim()) {
      return res.status(400).json({ success: false, error: 'Note text is required.' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const noteObject = {
      text: newNote.trim(),
      status: lead.status, // use current status
      createdBy: req.user ? req.user._id : null,
      createdAt: new Date()
    };

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            $each: [noteObject],
            $position: 0
          }
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
