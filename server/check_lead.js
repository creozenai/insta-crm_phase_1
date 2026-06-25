const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Lead = require('./models/Lead');
  const lead = await Lead.findById("6a3cea7ceaca3527bf33088b");
  console.log("Lead assigned to:", lead.assignedTo);
  
  const lead2 = await Lead.findOne({ username: 'nandhukishore_dreams' });
  if (lead2) {
    console.log("Lead nandhukishore_dreams id:", lead2._id, "assignedTo:", lead2.assignedTo);
  }

  process.exit(0);
});
