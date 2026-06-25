const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Task = require('./models/Task');
  const User = require('./models/User');

  const tasks = await Task.find({});
  console.log("ALL TASKS:");
  console.log(JSON.stringify(tasks, null, 2));

  process.exit(0);
});
