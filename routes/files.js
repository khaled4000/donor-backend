const express = require('express');
const multer = require('multer');
const Case = require('../models/Case');
const { auth } = require('../middleware/auth');
const { validateFileUpload } = require('../middleware/validation');
const router = express.Router();

// Configure multer for file uploads (in-memory storage for now)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, and DOC files are allowed.'), false);
    }
  },
});

// Upload single file
router.post('/upload', auth, upload.single('file'), validateFileUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { category, description, caseId } = req.body;

    // Convert file to base64 for storage (matching frontend approach)
    const base64Data = req.file.buffer.toString('base64');

    // Create file object
    const fileObject = {
      name: `${Date.now()}-${req.file.originalname}`,
      originalName: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      category: category || 'other',
      description: description || '',
      uploadDate: new Date(),
      base64: base64Data,
      checksum: require('crypto').createHash('md5').update(req.file.buffer).digest('hex'),
    };

    // If caseId is provided, add file to that case
    if (caseId) {
      const caseItem = await Case.findOne({
        caseId,
        userId: req.user._id,
      });

      if (!caseItem) {
        return res.status(404).json({ message: 'Case not found' });
      }

      caseItem.uploadedFiles.push(fileObject);
      await caseItem.save();
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileObject.checksum,
        name: fileObject.name,
        originalName: fileObject.originalName,
        type: fileObject.type,
        size: fileObject.size,
        category: fileObject.category,
        description: fileObject.description,
        uploadDate: fileObject.uploadDate,
        url: `/api/files/${fileObject.checksum}`, // URL to retrieve file
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 files per upload.' });
    }
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// Upload multiple files
router.post('/upload-multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { category, caseId } = req.body;
    const uploadedFiles = [];

    // Process each file
    for (const file of req.files) {
      const base64Data = file.buffer.toString('base64');

      const fileObject = {
        name: `${Date.now()}-${file.originalname}`,
        originalName: file.originalname,
        type: file.mimetype,
        size: file.size,
        category: category || 'other',
        description: `Uploaded on ${new Date().toLocaleDateString()}`,
        uploadDate: new Date(),
        base64: base64Data,
        checksum: require('crypto').createHash('md5').update(file.buffer).digest('hex'),
      };

      uploadedFiles.push({
        id: fileObject.checksum,
        name: fileObject.name,
        originalName: fileObject.originalName,
        type: fileObject.type,
        size: fileObject.size,
        category: fileObject.category,
        description: fileObject.description,
        uploadDate: fileObject.uploadDate,
        url: `/api/files/${fileObject.checksum}`,
      });

      // If caseId is provided, add files to that case
      if (caseId) {
        const caseItem = await Case.findOne({
          caseId,
          userId: req.user._id,
        });

        if (caseItem) {
          caseItem.uploadedFiles.push(fileObject);
          await caseItem.save();
        }
      }
    }

    res.status(201).json({
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'One or more files are too large. Maximum size is 10MB per file.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 files per upload.' });
    }
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// Get file by checksum/ID
router.get('/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;

    // Find case containing the file
    const caseWithFile = await Case.findOne({
      'uploadedFiles.checksum': fileId,
    });

    if (!caseWithFile) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = caseWithFile.uploadedFiles.find(f => f.checksum === fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(file.base64, 'base64');

    // Set appropriate headers
    res.set({
      'Content-Type': file.type,
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename="${file.originalName}"`,
    });

    res.send(buffer);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete file from case
router.delete('/:fileId', auth, async (req, res, _next) => {
  try {
    const fileId = req.params.fileId;
    const { caseId } = req.query;

    if (!caseId) {
      return res.status(400).json({ message: 'Case ID is required' });
    }

    const caseItem = await Case.findOne({
      caseId,
      userId: req.user._id,
    });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Find and remove the file
    const fileIndex = caseItem.uploadedFiles.findIndex(f => f.checksum === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const removedFile = caseItem.uploadedFiles[fileIndex];
    caseItem.uploadedFiles.splice(fileIndex, 1);
    await caseItem.save();

    res.json({
      message: 'File deleted successfully',
      file: {
        id: removedFile.checksum,
        name: removedFile.originalName,
      },
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get files for a specific case
router.get('/case/:caseId', auth, async (req, res) => {
  try {
    const caseItem = await Case.findOne({ caseId: req.params.caseId });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check if user owns the case or is an admin
    if (caseItem.userId.toString() !== req.user._id.toString() && req.user.role !== 'checker') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const files = caseItem.uploadedFiles.map(file => ({
      id: file.checksum,
      name: file.name,
      originalName: file.originalName,
      type: file.type,
      size: file.size,
      category: file.category,
      description: file.description,
      uploadDate: file.uploadDate,
      url: `/api/files/${file.checksum}`,
    }));

    res.json({
      message: 'Files fetched successfully',
      caseId: req.params.caseId,
      files,
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
    });
  } catch (error) {
    console.error('Get case files error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update file metadata
router.put('/:fileId', auth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { description, category, caseId } = req.body;

    if (!caseId) {
      return res.status(400).json({ message: 'Case ID is required' });
    }

    const caseItem = await Case.findOne({
      caseId,
      userId: req.user._id,
    });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Find and update the file
    const file = caseItem.uploadedFiles.find(f => f.checksum === fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (description !== undefined) {
      file.description = description;
    }
    if (category !== undefined && ['property_damage', 'identification', 'ownership', 'other'].includes(category)) {
      file.category = category;
    }

    await caseItem.save();

    res.json({
      message: 'File updated successfully',
      file: {
        id: file.checksum,
        name: file.originalName,
        type: file.type,
        size: file.size,
        category: file.category,
        description: file.description,
        uploadDate: file.uploadDate,
      },
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field.' });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }

  res.status(500).json({ message: 'Server error during file processing' });
});

module.exports = router;
