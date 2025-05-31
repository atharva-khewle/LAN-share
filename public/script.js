

// public/script.js

const socket = io();
let currentPath     = '';
let currentPdfDoc   = null;
let currentPdfPage  = 1;
let currentFilter   = {
  type: 'all',
  search: '',
  sortBy: 'name',
  sortOrder: 'asc'
};

// ─── Load & Display Shared Path ─────────────────────────────────────────────
async function loadSharedPath() {
  try {
    const resp = await fetch('/api/shared-path');
    const data = await resp.json();
    document.getElementById('currentPath').textContent = `Current: ${data.path}`;
  } catch (e) {
    console.error('Error loading shared path:', e);
  }
}

// ─── Load QR Codes ────────────────────────────────────────────────────────────
async function loadQRCode() {
  try {
    const resp = await fetch('/api/qr-code');
    const data = await resp.json();
    const qrDiv = document.getElementById('qrCode');
    if (data.qrCodes && data.qrCodes.length) {
      qrDiv.innerHTML = data.qrCodes.map(qr => `
        <div class="qr-item">
          <img src="${qr.qrCode}" alt="QR for ${qr.address}" />
          <p>Scan or visit:<br><a href="${qr.url}" target="_blank">${qr.url}</a></p>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Error loading QR codes:', e);
  }
}

// ─── Set New Shared Path (Admin Only) ────────────────────────────────────────
async function setSharedPath() {
  const newPath = document.getElementById('sharedPath').value.trim();
  if (!newPath) return;

  try {
    const resp = await fetch('/api/set-shared-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath })
    });
    const data = await resp.json();
    if (resp.ok) {
      document.getElementById('currentPath').textContent = `Current: ${data.path}`;
      document.getElementById('sharedPath').value = '';
      loadFiles('');
    } else {
      alert(data.error);
    }
  } catch (e) {
    console.error('Error setting shared path:', e);
    alert('Failed to set shared path');
  }
}

// ─── Load Files (List API) ───────────────────────────────────────────────────
async function loadFiles(sub = '') {
  try {
    const resp  = await fetch(`/api/list?path=${encodeURIComponent(sub)}`);
    const files = await resp.json();
    currentPath = sub;
    updateBreadcrumb();
    displayFiles(files);
  } catch (e) {
    console.error('Error loading files:', e);
  }
}

// ─── Breadcrumb Navigation ────────────────────────────────────────────────────
function updateBreadcrumb() {
  const bcDiv = document.getElementById('breadcrumb');
  const parts = currentPath.split('/').filter(Boolean);
  let html = `<span class="breadcrumb-item" onclick="loadFiles('')">
                <i class="fas fa-home"></i> Home
              </span>`;
  let accum = '';
  parts.forEach((part, idx) => {
    accum += (accum === '' ? part : `/${part}`);
    html += `<span class="breadcrumb-separator">/</span>
             <span class="breadcrumb-item" onclick="loadFiles('${accum}')">${part}</span>`;
  });
  bcDiv.innerHTML = html;
}

// ─── Icon Mapping ─────────────────────────────────────────────────────────────
function getFileIcon(name, isFolder) {
  if (isFolder) return 'fa-folder';
  const ext = name.toLowerCase().split('.').pop();
  const map = {
    // video → same icon
    mp4: 'fa-file-video', mkv: 'fa-file-video', avi: 'fa-file-video',
    mov: 'fa-file-video', webm: 'fa-file-video',

    // audio
    mp3: 'fa-file-audio', wav: 'fa-file-audio', ogg: 'fa-file-audio',

    // images
    jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image',
    gif: 'fa-file-image', webp: 'fa-file-image',

    // text
    txt: 'fa-file-alt', md: 'fa-file-alt', json: 'fa-file-code',

    // pdf / doc
    pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word',

    // archives
    zip: 'fa-file-archive', rar: 'fa-file-archive', '7z': 'fa-file-archive'
  };
  return map[ext] || 'fa-file';
}

function getFileType(name) {
  const ext = name.toLowerCase().split('.').pop();
  if (['mp4','mkv','avi','mov','webm'].includes(ext)) return 'video';
  if (['mp3','wav','ogg'].includes(ext)) return 'audio';
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image';
  if (['txt','md','json'].includes(ext)) return 'text';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

// ─── Filter + Sort ────────────────────────────────────────────────────────────
function filterAndSortFiles(files) {
  return files
    .filter(f => {
      if (currentFilter.type === 'all') return true;
      if (currentFilter.type === 'folder') return f.type === 'folder';
      return (f.type !== 'folder' && getFileType(f.name) === currentFilter.type);
    })
    .filter(f => f.name.toLowerCase().includes(currentFilter.search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (currentFilter.sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (currentFilter.sortBy === 'size') {
        cmp = bytes.parse(a.size) - bytes.parse(b.size);
      } else if (currentFilter.sortBy === 'modified') {
        cmp = new Date(a.modified) - new Date(b.modified);
      }
      return currentFilter.sortOrder === 'asc' ? cmp : -cmp;
    });
}

// ─── Display Files / Folders in Grid ─────────────────────────────────────────
function displayFiles(files) {
  const container = document.getElementById('fileList');
  container.innerHTML = '';
  const flt = filterAndSortFiles(files);

  flt.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'file-item';

    const iconClass = getFileIcon(item.name, item.type === 'folder');
    const fileType = item.type === 'folder' ? 'folder' : getFileType(item.name);
    const previewUrl = `/api/stream?path=${encodeURIComponent(item.path)}`;

    // Preview HTML
    let previewHTML = '';
    if (fileType === 'image') {
      previewHTML = `<img class="preview-img" src="${previewUrl}" alt="${item.name}" />`;
    } else {
      previewHTML = `<i class="fas ${iconClass}"></i>`;
    }

    div.innerHTML = `
      <div class="icon-container">${previewHTML}</div>
      <div class="info">
        <div class="name">${item.name}</div>
        <div class="meta">${item.size} • ${new Date(item.modified).toLocaleString()}</div>
      </div>
      <div class="actions">
        <button class="action-btn" onclick="event.stopPropagation(); renameItem('${item.path}')">
          <i class="fas fa-edit"></i>
        </button>
        ${item.type === 'file'
          ? `<div class="dropdown">
               <button class="action-btn" onclick="event.stopPropagation(); toggleDropdown(this)">
                 <i class="fas fa-download"></i>
               </button>
               <div class="dropdown-content">
                 <a href="#" onclick="event.stopPropagation(); downloadFile('${item.path}', false)">Download</a>
                 <a href="#" onclick="event.stopPropagation(); downloadFile('${item.path}', true)">Download as ZIP</a>
               </div>
             </div>`
          : ''}
      </div>
    `;

    // Click handlers
    if (item.type === 'folder') {
      div.onclick = () => loadFiles(item.path);
    } else {
      div.onclick = () => previewFile(item.path, item.name, fileType);
    }

    container.appendChild(div);
  });
}

// ─── Dropdown Toggle (Download links) ────────────────────────────────────────
function toggleDropdown(btn) {
  const drop = btn.nextElementSibling;
  drop.style.display = drop.style.display === 'block' ? 'none' : 'block';

  // Close when clicking outside
  const close = (e) => {
    if (!btn.contains(e.target)) {
      drop.style.display = 'none';
      document.removeEventListener('click', close);
    }
  };
  document.addEventListener('click', close);
}

// ─── Update Filters ──────────────────────────────────────────────────────────
function updateFilter(key, val) {
  currentFilter[key] = val;
  loadFiles(currentPath);
}

// ─── Preview File (Video/Audio/Image/Text/PDF) ─────────────────────────────
async function previewFile(relPath, name, type) {
  const previewOverlay = document.getElementById('mediaPreview');
  const videoPlayer    = document.getElementById('videoPlayer');
  const audioPlayer    = document.getElementById('audioPlayer');
  const imageViewer    = document.getElementById('imageViewer');
  const textViewer     = document.getElementById('textViewer');
  const pdfViewer      = document.getElementById('pdfViewer');
  const pdfControls    = document.getElementById('pdfControls');

  // Reset all
  document.getElementById('previewTitle').textContent = name;
  videoPlayer.style.display = 'none';
  audioPlayer.style.display = 'none';
  imageViewer.style.display = 'none';
  textViewer.style.display = 'none';
  pdfViewer.style.display = 'none';
  pdfControls.style.display = 'none';

  const mediaUrl = `/api/stream?path=${encodeURIComponent(relPath)}`;

  if (type === 'video') {
    videoPlayer.src = mediaUrl;
    videoPlayer.style.display = 'block';
  } else if (type === 'audio') {
    audioPlayer.src = mediaUrl;
    audioPlayer.style.display = 'block';
  } else if (type === 'image') {
    imageViewer.src = mediaUrl;
    imageViewer.style.display = 'block';
  } else if (type === 'text') {
    try {
      const resp = await fetch(`/api/preview?path=${encodeURIComponent(relPath)}`);
      const data = await resp.json();
      let content = data.content;
      if (relPath.endsWith('.md')) {
        content = marked.parse(content);
      } else if (relPath.endsWith('.json')) {
        content = `<pre><code class="language-json">${JSON.stringify(JSON.parse(content), null, 2)}</code></pre>`;
      } else {
        content = `<pre><code>${content}</code></pre>`;
      }
      textViewer.innerHTML = content;
      textViewer.style.display = 'block';
      hljs.highlightAll();
    } catch (e) {
      console.error('Error previewing text:', e);
      alert('Failed to load text');
      return;
    }
  } else if (type === 'pdf') {
    try {
      const loadingTask = pdfjsLib.getDocument(mediaUrl);
      currentPdfDoc = await loadingTask.promise;
      currentPdfPage = 1;
      await renderPdfPage(currentPdfPage);
      pdfViewer.style.display = 'block';
      pdfControls.style.display = 'flex';
    } catch (e) {
      console.error('Error loading PDF:', e);
      alert('Failed to load PDF');
      return;
    }
  }

  previewOverlay.style.display = 'flex';
}

async function renderPdfPage(pageNum) {
  const page = await currentPdfDoc.getPage(pageNum);
  const canvas = document.getElementById('pdfViewer');
  const ctx = canvas.getContext('2d');
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.height = viewport.height;
  canvas.width  = viewport.width;
  await page.render({ canvasContext: ctx, viewport }).promise;
  document.getElementById('pdfPageNum').textContent = `Page ${pageNum} of ${currentPdfDoc.numPages}`;
}

function prevPage() {
  if (currentPdfDoc && currentPdfPage > 1) {
    currentPdfPage--;
    renderPdfPage(currentPdfPage);
  }
}

function nextPage() {
  if (currentPdfDoc && currentPdfPage < currentPdfDoc.numPages) {
    currentPdfPage++;
    renderPdfPage(currentPdfPage);
  }
}

function closePreview() {
  const overlay = document.getElementById('mediaPreview');
  const v       = document.getElementById('videoPlayer');
  const a       = document.getElementById('audioPlayer');
  overlay.style.display = 'none';
  v.pause();
  v.src = '';
  a.pause();
  a.src = '';
  if (currentPdfDoc) {
    currentPdfDoc.destroy();
    currentPdfDoc = null;
  }
}

// ─── Download File ────────────────────────────────────────────────────────────
function downloadFile(relPath, compress) {
  window.location.href = `/api/download?path=${encodeURIComponent(relPath)}&compress=${compress}`;
}

// ─── Rename File/Folder ──────────────────────────────────────────────────────
async function renameItem(relPath) {
  const oldName = relPath.split('/').pop();
  let newName = prompt('Enter new name:', oldName);
  if (!newName || newName === oldName) return;

  // Detect extension—preserve it if missing
  const oldExt = oldName.includes('.') ? oldName.split('.').pop() : '';
  const newExt = newName.includes('.') ? newName.split('.').pop() : '';
  let finalName = newName;
  if (oldExt && oldExt !== newExt) {
    finalName = `${newName}.${oldExt}`;
  }

  const parentDir = relPath.split('/').slice(0, -1).join('/');
  const newPath = parentDir ? `${parentDir}/${finalName}` : finalName;

  try {
    const resp = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: relPath, to: newPath })
    });
    if (resp.ok) loadFiles(currentPath);
    else alert('Rename failed');
  } catch (e) {
    console.error('Error renaming:', e);
    alert('Rename failed');
  }
}

// ─── Create Folder ────────────────────────────────────────────────────────────
async function createNewFolder() {
  const folderName = prompt('Enter folder name:');
  if (!folderName) return;

  try {
    const resp = await fetch('/api/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentPath,
        name: folderName
      })
    });
    const data = await resp.json();
    if (resp.ok) {
      loadFiles(currentPath);
    } else {
      alert(data.error || 'Failed to create folder');
    }
  } catch (e) {
    console.error('Error creating folder:', e);
    alert('Failed to create folder');
  }
}

// ─── Live Search Filter ──────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', (e) => {
  currentFilter.search = e.target.value;
  loadFiles(currentPath);
});

// ─── Chat / Shared Text (Socket.IO) ──────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById('messageInput');
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit('chat message', msg);
  input.value = '';
}

document.getElementById('messageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

let textShareTimeout;
document.getElementById('sharedText').addEventListener('input', (e) => {
  clearTimeout(textShareTimeout);
  textShareTimeout = setTimeout(() => {
    socket.emit('text share', e.target.value);
  }, 500);
});

socket.on('chat message', (msg) => {
  const chatDiv = document.getElementById('chatMessages');
  const wrapper = document.createElement('div');
  wrapper.className = 'message';
  wrapper.innerHTML = `
    <div class="time">${new Date().toLocaleTimeString()}</div>
    <div class="content">${msg}</div>
  `;
  chatDiv.appendChild(wrapper);
  chatDiv.scrollTop = chatDiv.scrollHeight;
});

socket.on('text share', (text) => {
  const textarea = document.getElementById('sharedText');
  if (document.activeElement !== textarea) {
    textarea.value = text;
  }
});

// ─── Upload File Hander ──────────────────────────────────────────────────────
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath || '');

    const resp = await fetch(`/api/upload?path=${encodeURIComponent(currentPath)}`, {
      method: 'POST',
      body: formData
    });
    if (resp.ok) loadFiles(currentPath);
    else alert('Upload failed');
  } catch (e) {
    console.error('Error uploading:', e);
    alert('Upload failed');
  }
  e.target.value = '';
});




function displayFiles(files) {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '';

    // Apply filters
    const filteredFiles = files.filter(file => {
        const matchType = currentFilter.type === 'all' || 
            (currentFilter.type === 'folder' && file.type === 'folder') ||
            getFileType(file.name) === currentFilter.type;
        
        return matchType;
    });

    // Sort files
    filteredFiles.sort((a, b) => {
        switch(currentFilter.sort) {
            case 'name': return a.name.localeCompare(b.name);
            case 'date': return new Date(b.modified) - new Date(a.modified);
            case 'size': return parseInt(b.size) - parseInt(a.size);
        }
    });

    filteredFiles.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.innerHTML = `
            <i class="fas ${getFileIcon(file.name, file.type === 'folder')} fa-3x"></i>
            <p class="mt-2">${file.name}</p>
            <small>${file.size} • ${new Date(file.modified).toLocaleDateString()}</small>
        `;
        
        fileElement.onclick = () => {
            if (file.type === 'folder') {
                loadFiles(file.path);
            } else {
                previewFile(file.path, file.name);
            }
        };

        grid.appendChild(fileElement);
    });
}

function previewFile(path, name) {
    const previewModal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
    const previewContainer = document.getElementById('previewContainer');
    const previewTitle = document.getElementById('previewTitle');

    previewTitle.textContent = name;
    previewContainer.innerHTML = ''; // Clear previous preview

    const fileType = getFileType(name);
    const mediaUrl = `/api/stream?path=${encodeURIComponent(path)}`;

    switch(fileType) {
        case 'video':
            previewContainer.innerHTML = `
                <video controls style="max-width: 100%;">
                    <source src="${mediaUrl}" type="video/mp4">
                </video>
            `;
            break;
        case 'audio':
            previewContainer.innerHTML = `
                <audio controls style="width: 100%;">
                    <source src="${mediaUrl}">
                </audio>
            `;
            break;
        case 'image':
            previewContainer.innerHTML = `
                <img src="${mediaUrl}" style="max-width: 100%; max-height: 70vh;">
            `;
            break;
        // Add more preview types as needed
    }

    previewModal.show();
}


// ─── INITIAL SETUP ───────────────────────────────────────────────────────────
loadQRCode();
loadSharedPath();
loadFiles();





