const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Task = require('./models/Task');
  const Lead = require('./models/Lead');
  const User = require('./models/User');

  // Find the lead aswxn._03
  const lead = await Lead.findOne({ username: 'aswxn._03' });
  if (!lead) { console.log("Lead not found!"); process.exit(1); }
  console.log("Lead:", lead._id, "assignedTo:", lead.assignedTo);

  // Find the agent user
  const agent = await User.findOne({ email: 'agent@gmail.com' });
  console.log("Agent:", agent._id, agent.name);

  // All tasks for this lead
  const allTasks = await Task.find({ leadId: lead._id });
  console.log("\nALL tasks for this lead:", allTasks.length);
  allTasks.forEach(t => {
    console.log(`  Task: ${t._id} | type: ${t.type} | assignedTo: ${t.assignedTo} | createdBy: ${t.createdBy}`);
  });

  // Simulate agent query exactly as crmTasks.js does it
  const agentLeads = await Lead.find({ assignedTo: agent._id }).select('_id');
  const agentLeadIds = agentLeads.map(l => l._id);
  console.log("\nAgent's leads:", agentLeadIds);

  const query = {};
  query.leadId = lead._id.toString(); // This is how req.query.leadId comes in - as a STRING

  query.$or = [
    { assignedTo: agent._id },
    { createdBy: agent._id },
    { leadId: { $in: agentLeadIds } }
  ];

  console.log("\nSimulated query:", JSON.stringify(query, null, 2));
  const results = await Task.find(query);
  console.log("Results:", results.length);
  results.forEach(t => {
    console.log(`  Task: ${t._id} | type: ${t.type} | assignedTo: ${t.assignedTo}`);
  });

  // Now try without the leadId as string (as ObjectId)
  const query2 = {};
  query2.leadId = lead._id; // ObjectId
  query2.$or = [
    { assignedTo: agent._id },
    { createdBy: agent._id },
    { leadId: { $in: agentLeadIds } }
  ];
  console.log("\nQuery with ObjectId leadId:");
  const results2 = await Task.find(query2);
  console.log("Results:", results2.length);

  process.exit(0);
});
