/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Create uploads directory if it does not exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploads folder as static
  app.use('/uploads', express.static(uploadsDir));

  // Configure Multer storage to keep original file extension
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const parsed = path.parse(file.originalname);
      const safeName = parsed.name.replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${safeName}-${uniqueSuffix}${parsed.ext || '.mp3'}`);
    }
  });

  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const parsed = path.parse(file.originalname);
      const safeName = parsed.name.replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${safeName}-${uniqueSuffix}${parsed.ext || '.jpg'}`);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 15 * 1024 * 1024 // Limit to 15MB audio files
    },
    fileFilter: (req, file, cb) => {
      // Allow general audio files
      if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.mp3')) {
        cb(null, true);
      } else {
        cb(new Error('Hanya berkas audio saja (.mp3, dsb) yang diizinkan untuk diupload!'));
      }
    }
  });

  const uploadImage = multer({
    storage: imageStorage,
    limits: {
      fileSize: 10 * 1024 * 1024 // Limit to 10MB image files
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Hanya berkas gambar saja yang diizinkan untuk diupload!'));
      }
    }
  });

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API upload route
  app.post('/api/upload-audio', upload.single('audio'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'Tidak ada berkas yang diupload.' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const originalTitle = path.parse(req.file.originalname).name;

      return res.json({
        status: 'success',
        url: fileUrl,
        title: originalTitle
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memproses upload berkas audio.' });
    }
  });

  // API upload image route
  app.post('/api/upload-image', uploadImage.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'Tidak ada berkas gambar yang diupload.' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      return res.json({
        status: 'success',
        url: fileUrl
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memproses upload berkas gambar.' });
    }
  });

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
});
