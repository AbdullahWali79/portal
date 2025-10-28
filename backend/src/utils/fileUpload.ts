import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files for CVs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for CV uploads'));
    }
  }
});

/**
 * Upload file to Supabase Storage
 */
export const uploadToSupabase = async (
  file: Express.Multer.File,
  bucket: string,
  folder: string,
  fileName: string
): Promise<{ url: string; path: string }> => {
  try {
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload file to storage');
  }
};

/**
 * Generate signed URL for file upload
 */
export const generateSignedUrl = async (
  bucket: string,
  filePath: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, {
        expiresIn
      });

    if (error) throw error;

    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL generation error:', error);
    throw new Error('Failed to generate signed upload URL');
  }
};

/**
 * Delete file from Supabase Storage
 */
export const deleteFromSupabase = async (
  bucket: string,
  filePath: string
): Promise<void> => {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Supabase delete error:', error);
    throw new Error('Failed to delete file from storage');
  }
};

/**
 * Get file info from Supabase Storage
 */
export const getFileInfo = async (
  bucket: string,
  filePath: string
): Promise<any> => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(path.dirname(filePath), {
        search: path.basename(filePath)
      });

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('File info error:', error);
    throw new Error('Failed to get file information');
  }
};
