const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB...");
    const Lead = require('./models/Lead');
    const Conversation = require('./models/Conversation');
    const Message = require('./models/Message');

    // We fetch all hot leads to verify they actually deserve the hot status
    // If they were manually set to hot or come from another source, we'll still check for phone numbers
    // But to be safe, let's only target leads that don't have a phone number yet, or just check all of them.
    // The prompt says: "Fetches all leads whose source is DM and whose current status is Hot Lead."
    const query = { priority: 'hot', source: { $in: ['dm', 'automation'] } };
    const hotLeads = await Lead.find(query);
    console.log(`Found ${hotLeads.length} hot leads from DM/Automation.`);

    let downgradedCount = 0;
    let retainedCount = 0;

    for (const lead of hotLeads) {
      // Find conversations for this lead
      const conversations = await Conversation.find({ leadId: lead._id });
      const convIds = conversations.map(c => c._id);
      
      // Find all inbound messages for this lead
      const messages = await Message.find({ 
        conversationId: { $in: convIds },
        direction: 'inbound' 
      });

      let foundValidPhone = false;
      let extractedPhone = null;

      // Check if they already have a phone number saved in their profile
      if (lead.phone) {
        foundValidPhone = true;
        extractedPhone = lead.phone;
      } else {
        // If not, check their messages
        for (const msg of messages) {
          if (!msg.text) continue;
          const text = msg.text.replace(/[\s\-\.\(\)]/g, ''); 
          const phoneRegex = /(\+?\d{7,15})/;
          const match = text.match(phoneRegex);
          if (match) {
            foundValidPhone = true;
            extractedPhone = match[1];
            break;
          }
        }
      }

      if (foundValidPhone) {
        retainedCount++;
        if (!lead.phone) {
           lead.phone = extractedPhone;
           await lead.save();
           console.log(`[RETAINED] Lead ${lead.username || lead.platformUserId} - Phone found in DM: ${extractedPhone} (Saved to profile)`);
        } else {
           console.log(`[RETAINED] Lead ${lead.username || lead.platformUserId} - Phone already exists: ${lead.phone}`);
        }
      } else {
        downgradedCount++;
        lead.priority = 'normal';
        await lead.save();
        console.log(`[DOWNGRADED] Lead ${lead.username || lead.platformUserId} -> normal`);
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Retained as Hot (Phone found): ${retainedCount}`);
    console.log(`Downgraded to Normal (No phone found): ${downgradedCount}`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
