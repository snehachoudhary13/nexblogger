const express = require('express');
const path    = require('path');
const fs      = require('fs');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(require('cors')());
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/profile',   require('./routes/profile'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces/:slug/posts', require('./routes/posts'));

const { workspacePollRouter, standalonePollRouter } = require('./routes/polls');
app.use('/api/workspaces/:slug/polls', workspacePollRouter);
app.use('/api/polls', standalonePollRouter);

const { workspaceFileRouter, serveRouter } = require('./routes/files');
app.use('/api/workspaces/:slug/files', workspaceFileRouter);
app.use('/uploads', serveRouter);

app.get('/api/health', (req,res) => res.json({ status:'ok', ts:new Date().toISOString() }));

// In Docker: frontend is copied to ./public by Dockerfile
// In dev: frontend lives at ../frontend relative to backend
const FRONTEND = fs.existsSync(path.join(__dirname,'public'))
  ? path.join(__dirname,'public')
  : path.join(__dirname,'..','frontend');

app.use(express.static(FRONTEND));
app.get('*', (req,res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads'))
    res.sendFile(path.join(FRONTEND,'index.html'));
});

if (require.main === module)
  app.listen(PORT, () => console.log(`▶  NexBlogger on http://localhost:${PORT}`));

module.exports = app;
