
# 📁 LAN Share - File Sharing Over Local Network

A beautiful, real-time, web-based local network file sharing system with **live previews**, **QR access**, **upload/download support**, **folder management**, **global chat**, and **shared notes** – all running without internet access!

---

## ✨ Features

- ✅ Share a folder on your local machine via LAN
- 📁 Browse, sort, and filter files/folders visually
- 🔍 Search functionality
- 📤 Upload files directly through the browser
- 📂 Create new folders
- 🖼️ Preview images, audio, video, text, code, and PDFs directly in-browser
- 📥 Download files (with optional `.zip` compression)
- 📶 Access the server via QR code on other devices
- 💬 Real-time global chat and shared text notes (via Socket.IO)
- 🔐 Secure: prevents path traversal outside the shared folder

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v14+ recommended)
- A terminal with access to your LAN

### Installation

```bash
git clone https://github.com/yourusername/lan-share.git
cd lan-share
npm install
```

### Running the App

```bash
node server.js
```

You will be prompted to enter a **port number** (e.g., `3000`). After startup, the terminal will display LAN URLs with corresponding **QR codes** to connect via phone/tablet.

> ⚠️ **Important**: Ensure your firewall allows inbound connections on the chosen port.

---

## 🌐 Accessing the App

Once started, access the app from:

- Desktop: `http://localhost:3000`
- Phone/Tablet: Scan the generated QR code or use URLs like `http://192.168.1.x:3000`

---

## 🖼️ Supported File Previews

| Type     | Extensions                                                  |
|----------|-------------------------------------------------------------|
| Video    | mp4, mkv, avi, mov, webm, ...                               |
| Audio    | mp3, wav, ogg, ...                                          |
| Images   | jpg, jpeg, png, gif, webp, ...                              |
| Text     | txt, md, json, js, py, html, css, cpp, java, ...            |
| PDF      | pdf                                                         |
| Archive  | zip, rar, 7z → auto downloads                               |

---

## 📂 Folder Structure

```
project/
├── server.js         # Node.js backend (Express + Socket.IO)
├── public/
│   ├── index.html    # Main UI
│   └── script.js     # Frontend logic
└── shared/           # Default folder served to clients (can be changed)
```

---

## ⚙️ APIs Overview

| Endpoint                | Method | Description                           |
|-------------------------|--------|---------------------------------------|
| `/api/list?path=...`    | GET    | List files and folders                |
| `/api/preview?path=...` | GET    | Get file content for preview          |
| `/api/stream?path=...`  | GET    | Stream media/download file            |
| `/api/download`         | GET    | Download file with optional zip       |
| `/api/upload`           | POST   | Upload file via multipart             |
| `/api/create-folder`    | POST   | Create new folder                     |
| `/api/rename`           | POST   | Rename file or folder                 |
| `/api/set-shared-path`  | POST   | Set the root shared directory         |
| `/api/shared-path`      | GET    | Get current shared folder path        |
| `/api/qr-code`          | GET    | Get QR codes for all network IPs      |

---

## 🔒 Security

- Shared folder is sandboxed. Attempts to access outside the folder are blocked.
- Only the host machine can change the shared folder path.
- MIME types and preview limits are enforced.

---

## 🙌 Acknowledgements

- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [QRCode](https://github.com/soldair/node-qrcode)
- [Highlight.js](https://highlightjs.org/)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

## 📜 License

MIT License. Do whatever you want, but consider giving credit! 😊

---

## ✍️ Author

**Atharva Khewle**  
Twitter: [@atharvakhewle](https://twitter.com/atharvakhewle)  
GitHub: [atharvakhewle](https://github.com/atharvakhewle)

---

## 💡 Tip

Want to watch videos on your phone via VLC?

1. Open any video file in browser
2. Click "📺 Play in VLC"
3. Paste in VLC via `Ctrl+V` → Boom!
