const express = require('express');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const query = {};

    if (req.query.status) query.status = { $in: req.query.status.split(',') };
    if (req.query.priority) query.priority = { $in: req.query.priority.split(',') };
    if (req.query.type) query.type = { $in: req.query.type.split(',') };
    if (req.query.leadId) query.leadId = req.query.leadId;
    
    if (req.query.assignees && req.user.role === 'admin') {
      const assignees = req.query.assignees.split(',').map(a => a === 'me' ? req.user._id : a);
      query.assignedTo = { $in: assignees };
    } else if (req.user.role === 'agent') {
      const Lead = require('../models/Lead');
      const agentLeads = await Lead.find({ assignedTo: req.user._id }).select('_id');
      const agentLeadIds = agentLeads.map(l => l._id);

      query.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id },
        { leadId: { $in: agentLeadIds } }
      ];
    }

    if (req.query.dateRange) {
      const now = new Date();
      query.dueAt = {};
      
      if (req.query.dateRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        query.dueAt.$gte = start;
        query.dueAt.$lte = end;
      } else if (req.query.dateRange === 'tomorrow') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        query.dueAt.$gte = start;
        query.dueAt.$lte = end;
      } else if (req.query.dateRange === 'upcoming') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        query.dueAt.$gte = start;
        query.dueAt.$lte = end;
      } else if (req.query.dateRange === 'overdue') {
        query.dueAt.$lt = now;
        query.status = 'pending';
      } else if (req.query.dateRange === 'custom') {
        if (req.query.startDate) query.dueAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) query.dueAt.$lte = new Date(req.query.endDate);
      }
      
      if (Object.keys(query.dueAt).length === 0) {
        delete query.dueAt;
      }
    }

    let sort = { dueAt: 1 };
    if (req.query.sort) {
      if (req.query.sort === 'due_asc') sort = { dueAt: 1 };
      if (req.query.sort === 'due_desc') sort = { dueAt: -1 };
      if (req.query.sort === 'priority_desc') sort = { priority: -1 };
      if (req.query.sort === 'created_desc') sort = { createdAt: -1 };
      if (req.query.sort === 'created_asc') sort = { createdAt: 1 };
    }

    const tasks = await Task.find(query).sort(sort).populate('assignedTo', 'name email').populate('leadId', 'username phone city');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const task = await Task.create({ 
      ...req.body, 
      assignedTo: req.body.assignedTo !== undefined ? req.body.assignedTo : req.user._id,
      createdBy: req.user._id
    });
    
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('leadId', 'username phone city');
      
    res.status(201).json(populatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignedTo', 'name email')
      .populate('leadId', 'username phone city');
      
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
