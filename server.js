// const express = require('express');
// const multer = require('multer');
// const fs = require('fs').promises;
// const path = require('path');
// const bytes = require('bytes');
// const os = require('os');
// const http = require('http');
// const socketIo = require('socket.io');
// const normalize = require('normalize-path');
// const mime = require('mime-types');
// const QRCode = require('qrcode');
// const readline = require('readline');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// let port;
// let SHARED_FOLDER = path.join(__dirname, 'shared');
// let HOST_ADDRESS = null;

// // Store chat messages and shared text in memory
// let chatMessages = [];
// let sharedText = '';
// const MAX_CHAT_MESSAGES = 100;

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//     destination: async (req, file, cb) => {
//         const uploadPath = path.join(SHARED_FOLDER, req.query.path || '');
//         try {
//             await fs.access(uploadPath);
//             cb(null, uploadPath);
//         } catch {
//             await fs.mkdir(uploadPath, { recursive: true });
//             cb(null, uploadPath);
//         }
//     },
//     filename: (req, file, cb) => {
//         cb(null, file.originalname);
//     }
// });

// const upload = multer({ storage });

// // Middleware to normalize and validate paths
// function validatePath(userPath) {
//     const normalizedPath = normalize(path.normalize(userPath));
//     const resolvedPath = path.resolve(path.join(SHARED_FOLDER, normalizedPath));
    
//     if (!resolvedPath.startsWith(SHARED_FOLDER)) {
//         throw new Error('Access denied: Path outside shared folder');
//     }
    
//     return resolvedPath;
// }

// // Get network interfaces
// const getNetworkAddresses = () => {
//     const interfaces = os.networkInterfaces();
//     const addresses = [];
    
//     for (const iface of Object.values(interfaces)) {
//         for (const addr of iface) {
//             if (addr.family === 'IPv4' && !addr.internal) {
//                 addresses.push(addr.address);
//             }
//         }
//     }
    
//     return addresses;
// };

// // Middleware
// app.use(express.static('public'));
// app.use(express.json());

// // Get QR codes for all network addresses
// app.get('/api/qr-code', async (req, res) => {
//     try {
//         const addresses = getNetworkAddresses();
//         if (addresses.length > 0) {
//             const qrCodes = await Promise.all(addresses.map(async (address) => {
//                 const url = `http://${address}:${port}`;
//                 const qrDataUrl = await QRCode.toDataURL(url);
//                 return { qrCode: qrDataUrl, url, address };
//             }));
//             res.json({ qrCodes });
//         } else {
//             res.status(404).json({ error: 'No network interface found' });
//         }
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Get shared path
// app.get('/api/shared-path', (req, res) => {
//     res.json({ path: path.relative(process.cwd(), SHARED_FOLDER) });
// });

// // Set shared path (only allowed from host IP)
// app.post('/api/set-shared-path', async (req, res) => {
//     try {
//         const clientIp = req.ip.replace('::ffff:', '');
//         if (clientIp !== HOST_ADDRESS && clientIp !== '127.0.0.1') {
//             throw new Error('Only the host can change the shared path');
//         }

//         const newPath = path.resolve(req.body.path);
//         await fs.access(newPath);
//         SHARED_FOLDER = newPath;
//         res.json({ path: path.relative(process.cwd(), SHARED_FOLDER) });
//     } catch (error) {
//         res.status(403).json({ error: error.message });
//     }
// });

// // Create new folder
// app.post('/api/create-folder', async (req, res) => {
//     try {
//         const folderPath = validatePath(path.join(req.body.path || '', req.body.name));
//         await fs.mkdir(folderPath);
//         res.json({ message: 'Folder created successfully' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // List files and folders
// app.get('/api/list', async (req, res) => {
//     try {
//         const requestedPath = validatePath(req.query.path || '');
//         const items = await fs.readdir(requestedPath, { withFileTypes: true });
        
//         const fileList = await Promise.all(items.map(async (item) => {
//             const fullPath = path.join(requestedPath, item.name);
//             const stats = await fs.stat(fullPath);
//             const ext = path.extname(item.name).toLowerCase().slice(1);
            
//             return {
//                 name: item.name,
//                 type: item.isDirectory() ? 'folder' : 'file',
//                 size: bytes(stats.size),
//                 path: path.relative(SHARED_FOLDER, fullPath),
//                 extension: ext,
//                 modified: stats.mtime.toISOString()
//             };
//         }));

//         res.json(fileList);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Get file content for preview
// app.get('/api/preview', async (req, res) => {
//     try {
//         const filePath = validatePath(req.query.path || '');
//         const content = await fs.readFile(filePath, 'utf8');
//         res.json({ content });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Stream/download file
// app.get('/api/stream', async (req, res) => {
//     try {
//         const filePath = validatePath(req.query.path || '');
//         const stats = await fs.stat(filePath);
//         const mimeType = mime.lookup(filePath) || 'application/octet-stream';
//         const range = req.headers.range;

//         if (range) {
//             const parts = range.replace(/bytes=/, '').split('-');
//             const start = parseInt(parts[0], 10);
//             const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
//             const chunkSize = end - start + 1;
//             const fileStream = fs.createReadStream(filePath, { start, end });

//             res.writeHead(206, {
//                 'Content-Range': `bytes ${start}-${end}/${stats.size}`,
//                 'Accept-Ranges': 'bytes',
//                 'Content-Length': chunkSize,
//                 'Content-Type': mimeType,
//                 'Cache-Control': 'no-cache, no-store, must-revalidate',
//                 'Pragma': 'no-cache',
//                 'Expires': '0'
//             });

//             fileStream.pipe(res);
//         } else {
//             res.writeHead(200, {
//                 'Content-Length': stats.size,
//                 'Content-Type': mimeType,
//                 'Accept-Ranges': 'bytes',
//                 'Cache-Control': 'no-cache, no-store, must-revalidate',
//                 'Pragma': 'no-cache',
//                 'Expires': '0'
//             });

//             const fileStream = fs.createReadStream(filePath);
//             fileStream.pipe(res);
//         }
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Download file with compression option
// app.get('/api/download', async (req, res) => {
//     try {
//         const filePath = validatePath(req.query.path || '');
//         const compress = req.query.compress === 'true';
        
//         if (compress) {
//             const archiver = require('archiver');
//             const archive = archiver('zip', { zlib: { level: 9 } });
            
//             res.attachment(path.basename(filePath) + '.zip');
//             archive.pipe(res);
//             archive.file(filePath, { name: path.basename(filePath) });
//             archive.finalize();
//         } else {
//             res.download(filePath);
//         }
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Upload file
// app.post('/api/upload', upload.single('file'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//     }
//     res.json({ message: 'File uploaded successfully' });
// });

// // Rename file/folder
// app.post('/api/rename', async (req, res) => {
//     try {
//         const fromPath = validatePath(req.body.from || '');
//         const toPath = validatePath(req.body.to || '');

//         await fs.rename(fromPath, toPath);
//         res.json({ message: 'Renamed successfully' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Socket.IO chat and text share
// io.on('connection', (socket) => {
//     socket.emit('chat messages', chatMessages);
//     socket.emit('text share', sharedText);

//     socket.on('chat message', (msg) => {
//         const message = msg.trim();
//         if (message) {
//             const formattedMessage = `Anonymous: ${message}`;
//             chatMessages.push(formattedMessage);
//             if (chatMessages.length > MAX_CHAT_MESSAGES) {
//                 chatMessages.shift();
//             }
//             io.emit('chat message', formattedMessage);
//         }
//     });

//     socket.on('text share', (text) => {
//         sharedText = text;
//         socket.broadcast.emit('text share', text);
//     });
// });

// // Ask for port number
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

// rl.question('Enter port number (default: 3000): ', (answer) => {
//     port = parseInt(answer) || 3000;
//     rl.close();
    
//     // Start server
//     server.listen(port, '0.0.0.0', () => {
//         const networkAddresses = getNetworkAddresses();
//         HOST_ADDRESS = networkAddresses[0] || '127.0.0.1';
        
//         console.log(`File sharing server running at:`);
//         console.log(`Local: http://localhost:${port}`);
//         networkAddresses.forEach(addr => {
//             console.log(`Network: http://${addr}:${port}`);
//         });
//         console.log(`\nInitial shared folder: ${SHARED_FOLDER}`);
//         console.log(`Host Address: ${HOST_ADDRESS}`);
//     });
// });

// server.js
const express       = require('express');
const multer        = require('multer');
const fsPromises    = require('fs').promises;
const fs            = require('fs');
const path          = require('path');
const bytes         = require('bytes');
const os            = require('os');
const http          = require('http');
const socketIo      = require('socket.io');
const normalize     = require('normalize-path');
const mime          = require('mime-types');
const QRCode        = require('qrcode');
const readline      = require('readline');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server);

let port;
let SHARED_FOLDER = path.join(__dirname, 'shared');
let HOST_ADDRESS  = null;

// In-memory chat + shared text
let chatMessages = [];
let sharedText   = '';
const MAX_CHAT_MESSAGES = 100;

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // target folder = SHARED_FOLDER + user-supplied subpath
    const sub = req.query.path || '';
    const uploadPath = path.join(SHARED_FOLDER, normalize(path.normalize(sub)));
    try {
      await fsPromises.access(uploadPath);
    } catch {
      await fsPromises.mkdir(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Save with original name
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Helper: get local IPv4 addresses
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const ifaceArr of Object.values(interfaces)) {
    for (const iface of ifaceArr) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push(iface.address);
      }
    }
  }
  return results;
}

// Validate + normalize any requested path; prevent traversal outside SHARED_FOLDER
function validatePath(userPath) {
  const normalizedUserPath = normalize(path.normalize(userPath || ''));

  // Compute the absolute path under SHARED_FOLDER
  const resolved = path.resolve(path.join(SHARED_FOLDER, normalizedUserPath));
  if (!resolved.startsWith(SHARED_FOLDER)) {
    throw new Error('Access denied: Path outside shared folder');
  }
  return resolved;
}

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── QR Code Endpoint ───────────────────────────────────────────────────────
app.get('/api/qr-code', async (req, res) => {
  try {
    const addresses = getNetworkAddresses();
    if (!addresses.length) {
      return res.status(404).json({ error: 'No network interface found' });
    }
    const qrCodes = await Promise.all(
      addresses.map(async (addr) => {
        const url = `http://${addr}:${port}`;
        const qrDataUrl = await QRCode.toDataURL(url);
        return { qrCode: qrDataUrl, url, address: addr };
      })
    );
    res.json({ qrCodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get / Set Shared Path ──────────────────────────────────────────────────
app.get('/api/shared-path', (req, res) => {
  // Return relative path from project root for display
  res.json({ path: path.relative(process.cwd(), SHARED_FOLDER) });
});

app.post('/api/set-shared-path', async (req, res) => {
  try {
    const clientIp = req.ip.replace('::ffff:', '');
    if (clientIp !== HOST_ADDRESS && clientIp !== '127.0.0.1') {
      throw new Error('Only host can change the shared path');
    }

    const newAbs = path.resolve(req.body.path);
    await fsPromises.access(newAbs, fs.constants.R_OK);
    SHARED_FOLDER = newAbs;
    res.json({ path: path.relative(process.cwd(), SHARED_FOLDER) });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// ─── Create New Folder ──────────────────────────────────────────────────────
app.post('/api/create-folder', async (req, res) => {
  try {
    const parentSub = req.body.path || '';
    const folderName = req.body.name || '';
    if (!folderName.trim()) {
      throw new Error('Folder name required');
    }

    // Build final folder path (preserve extension check? Folders don’t have extension)
    const targetPath = validatePath(path.join(parentSub, folderName));
    await fsPromises.mkdir(targetPath, { recursive: true });
    res.json({ message: 'Folder created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── List Files & Folders ───────────────────────────────────────────────────
app.get('/api/list', async (req, res) => {
  try {
    const subPath = req.query.path || '';
    const absDir = validatePath(subPath);

    const dirents = await fsPromises.readdir(absDir, { withFileTypes: true });
    const result = await Promise.all(
      dirents.map(async (d) => {
        const full = path.join(absDir, d.name);
        const stats = await fsPromises.stat(full);
        const ext   = path.extname(d.name).toLowerCase().slice(1);

        return {
          name: d.name,
          type: d.isDirectory() ? 'folder' : 'file',
          size: bytes(stats.size),
          path: path.relative(SHARED_FOLDER, full).replace(/\\/g, '/'),
          extension: ext,
          modified: stats.mtime.toISOString()
        };
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview Text Files ─────────────────────────────────────────────────────
app.get('/api/preview', async (req, res) => {
  try {
    const absFile = validatePath(req.query.path || '');
    const content = await fsPromises.readFile(absFile, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stream / Download File ─────────────────────────────────────────────────
// Proper Range-based streaming for video/audio
app.get('/api/stream', async (req, res) => {
  try {
    const absFile = validatePath(req.query.path || '');
    const stats   = await fsPromises.stat(absFile);
    const mimeType = mime.lookup(absFile) || 'application/octet-stream';

    const range = req.headers.range;
    if (range) {
      // Parse “bytes=START-”
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end   = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(absFile, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fileStream.pipe(res);
    } else {
      // Full file download/stream (if client doesn’t request range)
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fs.createReadStream(absFile).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Download (with optional ZIP) ───────────────────────────────────────────
app.get('/api/download', async (req, res) => {
  try {
    const absFile = validatePath(req.query.path || '');
    const compress = req.query.compress === 'true';

    if (compress) {
      const archiver = require('archiver');
      const archive  = archiver('zip', { zlib: { level: 9 } });
      res.attachment(path.basename(absFile) + '.zip');
      archive.pipe(res);
      archive.file(absFile, { name: path.basename(absFile) });
      archive.finalize();
    } else {
      res.download(absFile);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Upload File ─────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ message: 'Uploaded successfully' });
});

// ─── Rename File/Folder (preserve extension) ─────────────────────────────────
app.post('/api/rename', async (req, res) => {
  try {
    const fromRel = req.body.from || '';
    const toRel   = req.body.to   || '';

    // Derive absolute “from” and extension
    const absFrom = validatePath(fromRel);
    const origExt = path.extname(absFrom);

    let targetName = toRel;
    // If user’s “to” lacks the original extension, append it
    if (origExt && !targetName.toLowerCase().endsWith(origExt.toLowerCase())) {
      targetName += origExt;
    }

    // Compute absolute “to”—stay in same folder
    const parentDir = path.dirname(absFrom);
    const absTo     = validatePath(path.join(path.relative(SHARED_FOLDER, parentDir), targetName));

    await fsPromises.rename(absFrom, absTo);
    res.json({ message: 'Renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Socket.IO: Chat + Text Share ────────────────────────────────────────────
io.on('connection', (socket) => {
  // Send existing messages + text
  socket.emit('chat messages', chatMessages);
  socket.emit('text share', sharedText);

  socket.on('chat message', (msg) => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    const timeStamped = `Anonymous: ${trimmed}`;
    chatMessages.push(timeStamped);
    if (chatMessages.length > MAX_CHAT_MESSAGES) {
      chatMessages.shift();
    }
    io.emit('chat message', timeStamped);
  });

  socket.on('text share', (text) => {
    sharedText = text;
    socket.broadcast.emit('text share', text);
  });
});

// ─── Prompt for Port & Start Server ─────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter port number (default: 3000): ', (answer) => {
  port = parseInt(answer) || 3000;
  rl.close();

  server.listen(port, '0.0.0.0', () => {
    const netAddrs = getNetworkAddresses();
    HOST_ADDRESS = netAddrs[0] || '127.0.0.1';

    console.log('File sharing server running at:');
    console.log(`  Local:   http://localhost:${port}`);
    netAddrs.forEach((addr) => console.log(`  Network: http://${addr}:${port}`));
    console.log('\nInitial shared folder:', SHARED_FOLDER);
  });
});
