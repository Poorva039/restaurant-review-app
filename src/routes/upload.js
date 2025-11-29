const express = require('express');
const multer = require('multer');
const { Octokit } = require('@octokit/rest');

const router = express.Router();

// Multer: in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function uploadToGithub(buffer, originalName) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const folder = process.env.GITHUB_UPLOAD_DIR || 'photos';

  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const base64Content = buffer.toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Upload image ${safeName}`,
    content: base64Content,
    branch
  });

  // Raw URL
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

// POST /api/uploads/image
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No image uploaded' });
    }

    const url = await uploadToGithub(req.file.buffer, req.file.originalname);

    return res.json({ success: true, url });
  } catch (err) {
    console.error('GitHub upload error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
