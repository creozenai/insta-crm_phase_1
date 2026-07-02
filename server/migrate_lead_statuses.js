require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function migrateStatuses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Mappings: handling both lower-case legacy and provided exact names if any
    const statusMap = {
      'new': 'New',
      'new lead': 'New',
      'New Lead': 'New',
      'contacted': 'Contacted',
      'Contacted': 'Contacted', // just in case
      'qualified': 'New',
      'Qualified': 'New',
      'converted': 'Won',
      'Converted': 'Won',
      'lost': 'Lost',
      'Lost': 'Lost'
    };

    const oldStatuses = Object.keys(statusMap);
    
    // Find leads with old statuses
    const leadsToMigrate = await Lead.find({ status: { $in: oldStatuses } });
    console.log(`Found ${leadsToMigrate.length} leads matching the old status criteria.`);

    let bulkOps = [];
    let updatedCount = 0;

    for (const lead of leadsToMigrate) {
      const oldStatus = lead.status;
      const newStatus = statusMap[oldStatus] || statusMap[oldStatus.toLowerCase()];
      
      if (newStatus && newStatus !== oldStatus) {
        bulkOps.push({
          updateOne: {
            filter: { _id: lead._id },
            update: { $set: { status: newStatus } }
          }
        });
        
        // Execute in batches of 500
        if (bulkOps.length >= 500) {
          const result = await Lead.bulkWrite(bulkOps);
          updatedCount += result.modifiedCount;
          bulkOps = [];
        }
      }
    }

    // Execute remaining
    if (bulkOps.length > 0) {
      const result = await Lead.bulkWrite(bulkOps);
      updatedCount += result.modifiedCount;
    }

    console.log(`Migration complete. Successfully updated ${updatedCount} leads.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateStatuses();
