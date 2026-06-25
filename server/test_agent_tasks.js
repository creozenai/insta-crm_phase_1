const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Task = require('./models/Task');
  const Lead = require('./models/Lead');
  const User = require('./models/User');

  // Let's find Nandhu Kishore
  const agent = await User.findOne({ name: { $regex: /Nandhu/i } });
  if (!agent) {
    console.log("Agent not found!");
    process.exit(1);
  }
  console.log("Agent:", agent.name, agent._id);

  // The lead ID from the screenshots? Let's just find the lead assigned to the agent
  const agentLeads = await Lead.find({ assignedTo: agent._id }).select('_id');
  const agentLeadIds = agentLeads.map(l => l._id);
  console.log("Agent Leads:", agentLeadIds);

  const query = {};
  // Simulate the leadId query
  query.leadId = agentLeadIds.length > 0 ? agentLeadIds[0].toString() : "dummy";

  query.$or = [
    { assignedTo: agent._id },
    { createdBy: agent._id },
    { leadId: { $in: agentLeadIds }, assignedTo: null },
    { leadId: { $in: agentLeadIds }, assignedTo: { $exists: false } }
  ];

  console.log("Query object:", JSON.stringify(query, null, 2));

  const tasks = await Task.find(query);
  console.log("Tasks found:", tasks.length);
  if (tasks.length > 0) {
    console.log(tasks[0]._id, tasks[0].notes);
  } else {
    // If no tasks found, let's see what is actually in DB for this leadId
    const allTasksForLead = await Task.find({ leadId: query.leadId });
    console.log(`All tasks for lead ${query.leadId}:`, allTasksForLead.length);
    console.log(allTasksForLead.map(t => ({ id: t._id, assignedTo: t.assignedTo, createdBy: t.createdBy })));
  }

  process.exit(0);
});
