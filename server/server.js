const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize Cron Jobs
const { initCronJobs } = require('./services/cronService');
initCronJobs();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routers
app.set('io', io);

// --- CLIENT-NEW COMPATIBILITY ALIASES ---
// Settings endpoints with real MongoDB persistence
app.get('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const doc = await Setting.findOne({ key: 'global_settings' });
    res.json(doc ? doc.value : {
      autoCommentReply: true, commentReplyText: "",
      autoDMReply: true, dmReplyText: "",
      dmOnComment: false, dmOnCommentText: ""
    });
  } catch(err) { res.json({}); }
});
app.post('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    await Setting.findOneAndUpdate({ key: 'global_settings' }, { value: req.body }, { upsert: true });
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false }); }
});

// Intercept analytics dashboard to provide REAL data in the shape client-new expects
app.get('/api/analytics/dashboard', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const Message = require('./models/Message');
    const AutoReplyRule = require('./models/AutoReplyRule');

    const { period, startDate, endDate } = req.query;
    let startLimit = null;
    let endLimit = null;

    if (startDate && endDate) {
      startLimit = new Date(startDate);
      endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);
    } else if (period) {
      if (period === '24h') {
        startLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
        endLimit = new Date();
      } else {
        const daysNum = parseInt(period, 10);
        startLimit = new Date();
        startLimit.setDate(startLimit.getDate() - daysNum + 1);
        startLimit.setHours(0, 0, 0, 0);
        endLimit = new Date();
        endLimit.setHours(23, 59, 59, 999);
      }
    }

    const dateQuery = {};
    if (startLimit && endLimit) {
      dateQuery.createdAt = { $gte: startLimit, $lte: endLimit };
    }
    const leadQuery = { ...dateQuery, isPipelineLead: true };

    const totalLeads = await Lead.countDocuments(leadQuery);
    const hotLeads = await Lead.countDocuments({ ...leadQuery, priority: 'hot' });
    const wonLeads = await Lead.countDocuments({ ...leadQuery, status: 'converted' });
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;
    
    // Calculate distributions
    const newCount = await Lead.countDocuments({ ...leadQuery, status: 'new' });
    const contactedCount = await Lead.countDocuments({ ...leadQuery, status: 'contacted' });
    const qualifiedCount = await Lead.countDocuments({ ...leadQuery, status: 'qualified' });
    const convertedCount = await Lead.countDocuments({ ...leadQuery, status: 'converted' });
    const lostCount = await Lead.countDocuments({ ...leadQuery, status: 'lost' });

    // Calculate sources
    const dmCount = await Lead.countDocuments({ ...leadQuery, source: 'dm' });
    const commentCount = await Lead.countDocuments({ ...leadQuery, source: 'comment' });
    const manualCount = await Lead.countDocuments({ ...leadQuery, source: 'manual' });

    // Calculate social
    const incomingDMs = await Message.countDocuments({ ...dateQuery, direction: 'inbound' });
    const outgoingDMs = await Message.countDocuments({ ...dateQuery, direction: 'outbound' });
    
    const Comment = require('./models/Comment');
    const incomingComments = await Comment.countDocuments({ ...dateQuery, direction: 'inbound' });
    const outgoingComments = await Comment.countDocuments({ ...dateQuery, direction: 'outbound' });

    const totalAutomatedDMs = await Message.countDocuments({ ...dateQuery, isAutomated: true });
    const totalAutomatedComments = await Comment.countDocuments({ ...dateQuery, isAutomated: true });
    const totalAutomations = totalAutomatedDMs + totalAutomatedComments;
    
    const Task = require('./models/Task');
    const pendingTasks = await Task.countDocuments({ ...dateQuery, status: 'pending' });

    // Calculate chart data
    const chartData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const chartStart = startLimit || new Date(new Date().setDate(new Date().getDate() - 6));
    if (!startLimit) chartStart.setHours(0,0,0,0);
    const chartEnd = endLimit || new Date();

    if (period === '24h') {
      const msgsData = await Message.aggregate([
        { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]);

      const commentsData = await Comment.aggregate([
        { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]);

      const leadsData = await Lead.aggregate([
        { $match: { isPipelineLead: true, createdAt: { $gte: chartStart, $lte: chartEnd } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]);

      const msgsMap = msgsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const commentsMap = commentsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const leadsMap = leadsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

      for (let i = 23; i >= 0; i--) {
        const d = new Date(chartEnd);
        d.setHours(d.getHours() - i);
        const label = `${d.getHours().toString().padStart(2, '0')}:00`;
        const dateStr = d.toISOString().split(':')[0].replace('T', ' ');

        chartData.push({
          day: label,
          fullDate: d.toISOString(),
          messages: msgsMap[dateStr] || 0,
          comments: commentsMap[dateStr] || 0,
          leads: leadsMap[dateStr] || 0
        });
      }
    } else {
      const diffTime = Math.abs(chartEnd - chartStart);
      let daysToIterate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysToIterate === 0) daysToIterate = 1;
      if (daysToIterate > 365) daysToIterate = 365;

      const msgsData = await Message.aggregate([
        { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]);

      const commentsData = await Comment.aggregate([
        { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]);

      const leadsData = await Lead.aggregate([
        { $match: { isPipelineLead: true, createdAt: { $gte: chartStart, $lte: chartEnd } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]);

      const msgsMap = msgsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const commentsMap = commentsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const leadsMap = leadsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

      for(let i = daysToIterate - 1; i >= 0; i--) {
        const d = new Date(chartEnd);
        d.setDate(d.getDate() - i);
        
        const dateStr = d.toISOString().split('T')[0];
        
        let label = days[d.getDay()];
        if (daysToIterate > 14) {
          label = `${d.getMonth()+1}/${d.getDate()}`;
        }
        
        chartData.push({
          day: label,
          fullDate: dateStr,
          messages: msgsMap[dateStr] || 0,
          comments: commentsMap[dateStr] || 0,
          leads: leadsMap[dateStr] || 0
        });
      }
    }
    
    res.json({
      leads: { 
        total: totalLeads, 
        hot: hotLeads, 
        conversionRate, 
        distribution: { new: newCount, contacted: contactedCount, qualified: qualifiedCount, converted: convertedCount, lost: lostCount }, 
        sources: { dm: dmCount, comment: commentCount, manual: manualCount } 
      },
      tasks: { pending: pendingTasks },
      social: { incomingDMs: incomingDMs, outgoingDMs: outgoingDMs, totalComments: incomingComments + outgoingComments, totalAutomations: totalAutomations },
      chartData: chartData,
      recentLogs: []
    });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/analytics/wordcloud', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const { calculateWordCloud } = require('./services/cronService');

    let cache = await Setting.findOne({ key: 'wordcloud_cache' });
    
    if (!cache || !cache.value) {
      const data = await calculateWordCloud();
      return res.status(200).json(data || []);
    }

    res.status(200).json(cache.value);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy leads to strip the { success, data } wrapper
app.get('/api/leads', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const query = { isPipelineLead: true };

    if (req.query.search) {
      query.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.status) query.status = { $in: req.query.status.split(',') };
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.source) query.source = req.query.source;
    
    // Role-based restrictions
    if (req.user && req.user.role === 'agent') {
      query.assignedTo = req.user._id;
    } else if (req.query.assignedTo) {
      // Admin filtering by specific agent
      if (req.query.assignedTo === 'unassigned') {
        query.assignedTo = null;
      } else if (req.query.assignedTo === 'me') {
        query.assignedTo = req.user._id;
      } else {
        query.assignedTo = req.query.assignedTo;
      }
    } else if (req.query.assignedToMe === 'true') {
      query.assignedTo = req.user._id;
    }

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    if (req.query.postId) {
      const Comment = require('./models/Comment');
      const comments = await Comment.find({ mediaId: req.query.postId });
      query._id = { $in: comments.map(c => c.leadId) };
    }

    let sort = { createdAt: -1, _id: -1 };
    if (req.query.sort) {
      if (req.query.sort === 'updated_desc') sort = { updatedAt: -1, _id: -1 };
      if (req.query.sort === 'newest') sort = { createdAt: -1, _id: -1 };
      if (req.query.sort === 'oldest') sort = { createdAt: 1, _id: 1 };
      if (req.query.sort === 'username_asc') sort = { username: 1, _id: 1 };
      if (req.query.sort === 'username_desc') sort = { username: -1, _id: -1 };
    }

    const leads = await Lead.find(query)
      .collation({ locale: 'en', strength: 2 })
      .sort(sort)
      .populate('assignedTo', 'name email');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy to create leads manually from client-new
app.post('/api/leads', require('./middleware/authMiddleware').protect, async (req, res) => {
  const Lead = require('./models/Lead');
  try {
    const leadData = { ...req.body, isPipelineLead: true };
    const newLead = await Lead.create(leadData);
    res.json(newLead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/leads/bulk-delete', require('./middleware/authMiddleware').protect, async (req, res) => {
  const Lead = require('./models/Lead');
  try {
    await Lead.deleteMany({ _id: { $in: req.body.leadIds } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// Auth compatibility proxy
const { login, register, getMe } = require('./controllers/authController');

app.post('/api/auth/crm/login', async (req, res) => {
  // We need to wrap the response to match what client-new expects
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) {
      if (data.success && data.token) {
        return res.status(this.statusCode || 200).json({
          accessToken: data.token,
          refreshToken: data.token, // Mock refresh token
          user: { 
            _id: data.user ? data.user._id : data._id, 
            name: data.user ? data.user.name : data.name, 
            email: data.user ? data.user.email : data.email, 
            role: data.user ? data.user.role : (data.role || 'admin') 
          }
        });
      }
      return res.status(this.statusCode || 401).json(data);
    }
  };
  await login(req, mockRes);
});

app.post('/api/auth/crm/register', async (req, res) => {
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) {
      if (data.success && data.token) {
        return res.status(this.statusCode || 200).json({ accessToken: data.token, refreshToken: data.token, user: { _id: data._id, name: data.name, email: data.email, role: data.role || 'admin' } });
      }
      return res.status(this.statusCode || 400).json(data);
    }
  };
  await register(req, mockRes);
});

app.get('/api/auth/crm/me', require('./middleware/authMiddleware').protect, async (req, res) => {
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) {
      if (data.success && data.data) {
        return res.status(this.statusCode || 200).json(data.data);
      }
      return res.status(this.statusCode || 200).json(data);
    }
  };
  await getMe(req, mockRes);
});

app.post('/api/auth/crm/refresh', (req, res) => {
  res.json({ accessToken: req.body.refreshToken }); // Mock refresh
});
app.post('/api/auth/crm/logout', (req, res) => res.json({ success: true }));

app.get('/api/auth/crm/users', require('./middleware/authMiddleware').protect, async (req, res) => {
  const User = require('./models/User');
  const users = await User.find().select('-password');
  res.json(users);
});
app.post('/api/auth/crm/create-agent', require('./middleware/authMiddleware').protect, async (req, res) => {
  // Mock agent creation for backwards compatibility with client-new
  const User = require('./models/User');
  const newUser = await User.create(req.body);
  res.json(newUser);
});
app.put('/api/auth/crm/users/:id', require('./middleware/authMiddleware').protect, async (req, res) => {
  const User = require('./models/User');
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {new: true}).select('-password');
  res.json(user);
});
app.delete('/api/auth/crm/users/:id', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const User = require('./models/User');
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/rules-templates', require('./routes/crmRulesTemplates')); // Maps /api/rules-templates/rules

app.get('/api/connection-status', (req, res) => res.json({ connected: true, status: 'Active' }));
app.get('/api/account/posts', async (req, res) => {
  try {
    const axios = require('axios');
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) return res.json({ posts: [], nextMediaCursor: null, nextTagsCursor: null });
    
    // 1. Get IG Business Account ID
    const pageRes = await axios.get(`https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${token}`);
    const igAccountId = pageRes.data?.instagram_business_account?.id;
    if (!igAccountId) return res.json({ posts: [], nextMediaCursor: null, nextTagsCursor: null });

    const { afterMedia, afterTags } = req.query;

    let mediaUrl = null;
    if (afterMedia !== 'done') {
      mediaUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,caption,media_url,thumbnail_url,timestamp,permalink&limit=20&access_token=${token}`;
      if (afterMedia) mediaUrl += `&after=${afterMedia}`;
    }

    const promises = [];
    if (mediaUrl) promises.push(axios.get(mediaUrl).then(r => ({ type: 'media', data: r.data })).catch(e => ({ type: 'media', error: e })));

    const results = await Promise.all(promises);

    let nextMediaCursor = afterMedia === 'done' ? 'done' : null;
    let nextTagsCursor = 'done'; // Hardcoded to done since we no longer fetch tags
    const rawPosts = [];

    for (const r of results) {
      if (r.error) {
        console.error(`[Posts API] Failed to fetch ${r.type}:`, r.error.response?.data || r.error.message);
        if (r.type === 'media') nextMediaCursor = 'done';
        continue;
      }
      rawPosts.push(...(r.data.data || []));
      
      const cursors = r.data.paging?.cursors;
      const nextUrl = r.data.paging?.next;
      
      if (r.type === 'media') {
        nextMediaCursor = nextUrl && cursors?.after ? cursors.after : 'done';
      }
    }

    // Deduplicate by ID and map
    const uniquePosts = [];
    const seen = new Set();
    for (const p of rawPosts) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        uniquePosts.push({
          id: p.id,
          mediaId: p.id,
          caption: p.caption || '',
          mediaUrl: p.media_url,
          thumbnailUrl: p.thumbnail_url || p.media_url,
          timestamp: p.timestamp,
          permalink: p.permalink
        });
      }
    }

    // Sort descending by timestamp (this only sorts the current batch)
    uniquePosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      posts: uniquePosts,
      nextMediaCursor,
      nextTagsCursor
    });
  } catch (err) {
    console.error('[Posts API Error]', err.response?.data || err.message);
    res.json({ posts: [], nextMediaCursor: 'done', nextTagsCursor: 'done' });
  }
});
app.get('/api/analytics/sync', (req, res) => res.json({ success: true }));

// Standard Routes
app.use('/api/auth', require('./routes/crmAuth'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/leads', require('./routes/crmLeads'));
app.use('/api/rules', require('./routes/crmRulesTemplates'));
app.use('/api/tasks', require('./routes/crmTasks'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/analytics', require('./routes/crmAnalytics'));
app.use('/api/meta', require('./routes/meta'));

// Client-new specific lead routes
app.get('/api/leads/agents', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const User = require('./models/User');
    const agents = await User.find().select('name email role');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});
app.get('/api/leads/posts-with-leads', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Comment = require('./models/Comment');
    const Lead = require('./models/Lead');
    
    // Find all pipeline leads that came from comments
    const commentLeads = await Lead.find({ isPipelineLead: true, source: 'comment' }).select('_id');
    const leadIds = commentLeads.map(l => l._id);
    
    // Get distinct mediaIds from comments linked to those leads
    const mediaIds = await Comment.distinct('mediaId', { 
      leadId: { $in: leadIds },
      mediaId: { $ne: null, $exists: true }
    });
    
    res.json(mediaIds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts with leads' });
  }
});
app.get('/api/leads/:id/timeline', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const Message = require('./models/Message');
    const Conversation = require('./models/Conversation');
    
    const Comment = require('./models/Comment');
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const convQuery = { $or: [{ leadId: req.params.id }] };
    if (lead.platformUserId) {
      convQuery.$or.push({ instagramThreadId: `thread_${lead.platformUserId}` });
    }

    const convs = await Conversation.find(convQuery);
    const convIds = convs.map(c => c._id);
    const messages = await Message.find({ conversationId: { $in: convIds } });
    const comments = await Comment.find({ leadId: lead._id });
    
    const timeline = [
      ...messages.map(msg => ({
        id: msg._id,
        type: 'dm',
        text: msg.text,
        timestamp: msg.createdAt,
        sender: msg.direction === 'inbound' ? 'USER' : (msg.isAutomated ? 'BOT' : 'AGENT')
      })),
      ...comments.map(c => ({
        id: c.instagramCommentId || c._id,
        type: 'comment',
        text: c.text,
        timestamp: c.createdAt,
        sender: c.direction === 'outbound' ? (c.isAutomated ? 'BOT' : 'AGENT') : 'USER',
        mediaId: c.mediaId,
        mediaUrl: c.postThumbnail,
        postThumbnail: c.postThumbnail,
        postCaption: c.postCaption,
        replyToCommentId: c.parentCommentId
      }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({ timeline });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});
app.get('/api/leads/:id', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const lead = await Lead.findById(req.params.id);
    res.json(lead);
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Allow sending messages via /api/messages/send (maps to conversations controller)
const messageRoutes = express.Router();
const { addMessage } = require('./controllers/conversationController');
messageRoutes.post('/send', require('./middleware/authMiddleware').protect, async (req, res) => {
  // Translate the payload if necessary, or just call the controller
  // client-new expects to send to a specific lead or conversation
  // For safety, we will just proxy it
  const { leadId, text, type } = req.body;
  
  try {
    const Conversation = require('./models/Conversation');
    let conv = await Conversation.findOne({ leadId });
    if (!conv) {
      conv = await Conversation.create({ leadId, status: 'open', lastMessageAt: new Date() });
    }
    // inject conversationId to req.params for the controller
    req.params.id = conv._id;
    return addMessage(req, res);
  } catch(err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('Instagram CRM API is running');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
