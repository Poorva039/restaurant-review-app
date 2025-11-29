// src/routes/upload.js
const express = require('express');
const multer = require('multer');

const router = express.Router();

// Multer: in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ---- Lazy ESM import for @octokit/rest ----
let octokitClientPromise = null;

async function getOctokit() {
  if (!octokitClientPromise) {
    octokitClientPromise = (async () => {
      const { Octokit } = await import('@octokit/rest'); // ESM import
      return new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
    })();
  }
  return octokitClientPromise;
}

// ---- Helper to upload file to GitHub ----
  async function uploadToGithub(buffer, originalName) {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const uploadDir = process.env.GITHUB_UPLOAD_DIR || 'photos';

    // DEBUG: log what Vercel actually sees
    console.log('UPLOAD ENV DEBUG:', {
      owner,
      repo,
      branch,
      uploadDir,
      hasToken: !!process.env.GITHUB_TOKEN,
    });

  if (!owner || !repo || !process.env.GITHUB_TOKEN) {
    console.error('Missing envs:', {
      owner,
      repo,
      hasToken: !!process.env.GITHUB_TOKEN,
    });
    throw new Error('Missing GitHub configuration env vars');
  }

  // Make a safe filename
  const safeName = (originalName || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-');

  const fileName = `${Date.now()}-${safeName}`;
  const path = `${uploadDir}/${fileName}`;

  const contentEncoded = buffer.toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message: `Add uploaded image ${fileName}`,
    content: contentEncoded
  });

  // Public raw URL (same pattern as your dataset images)
  const url = `https://github.com/${owner}/${repo}/raw/${branch}/${path}`;
  return url;
}

// ---- Route: POST /api/uploads/image ----
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded' });
    }

    const url = await uploadToGithub(req.file.buffer, req.file.originalname);

    return res.json({ success: true, url });
  } catch (err) {
    console.error('GitHub upload error:', err);

    // Return the full error message to frontend (TEMPORARY)
    return res
      .status(500)
      .json({ 
        success: false, 
        message: err.message || 'Upload failed',
        error: err
      });
  }
});


module.exports = router;
