import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * GET /api/posts
 * Public listing, only visible posts and not expired
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      location, 
      employment_type, 
      experience_level,
      remote_ok,
      salary_min,
      salary_max,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Validation
    if (Number(page) < 1 || Number(limit) < 1 || Number(limit) > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        valid_range: { page: '>= 1', limit: '1-100' }
      });
    }

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        location,
        remote_ok,
        employment_type,
        experience_level,
        salary_min,
        salary_max,
        currency,
        visible,
        created_at,
        expires_at,
        companies (
          id,
          name,
          logo_url,
          location
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('visible', true) // Only visible posts
      .gt('expires_at', new Date().toISOString()); // Only non-expired posts

    // Apply filters
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (employment_type) {
      query = query.eq('employment_type', employment_type);
    }

    if (experience_level) {
      query = query.eq('experience_level', experience_level);
    }

    if (remote_ok === 'true') {
      query = query.eq('remote_ok', true);
    }

    if (salary_min) {
      query = query.gte('salary_min', Number(salary_min));
    }

    if (salary_max) {
      query = query.lte('salary_max', Number(salary_max));
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order(sort_by as string, { ascending: sort_order === 'asc' })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    res.json({
      posts: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil((count || 0) / Number(limit))
      },
      filters: {
        location,
        employment_type,
        experience_level,
        remote_ok,
        salary_min,
        salary_max,
        search
      }
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch job posts' });
  }
});

/**
 * GET /api/posts/:id
 * Get single job post details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        requirements,
        benefits,
        location,
        remote_ok,
        employment_type,
        experience_level,
        salary_min,
        salary_max,
        currency,
        contact_email,
        contact_phone,
        image_url,
        visible,
        created_at,
        expires_at,
        companies (
          id,
          name,
          description,
          website,
          logo_url,
          location,
          industry,
          size
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .eq('visible', true) // Only visible posts
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Job post not found or expired' });
    }

    res.json(data);

  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch job post' });
  }
});

/**
 * POST /api/posts/:id/apply
 * Candidate applies for job (accepts cv file upload or cv_url)
 */
router.post('/:id/apply', authenticateToken, requireRole(['job_seeker']), async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { cover_letter, cv_url, cv_file } = req.body;

    // Validation
    if (!cover_letter || (!cv_url && !cv_file)) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['cover_letter', 'cv_url OR cv_file']
      });
    }

    // Check if post exists and is active
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, title, is_active, expires_at')
      .eq('id', postId)
      .single();

    if (postError) throw postError;
    if (!post) {
      return res.status(404).json({ error: 'Job post not found' });
    }

    if (!post.is_active || new Date(post.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This job post is no longer accepting applications' });
    }

    // Check if user already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('post_id', postId)
      .eq('applicant_id', req.user.id)
      .single();

    if (existingApplication) {
      return res.status(409).json({ error: 'You have already applied for this job' });
    }

    let finalCvUrl = cv_url;

    // Handle file upload if cv_file is provided
    if (cv_file) {
      try {
        // Generate signed URL for file upload
        const fileName = `cv_${req.user.id}_${Date.now()}.pdf`;
        const filePath = `cvs/${req.user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('cvs')
          .upload(filePath, cv_file, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('cvs')
          .getPublicUrl(filePath);

        finalCvUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload CV file' });
      }
    }

    // Create application
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert([{
        post_id: postId,
        applicant_id: req.user.id,
        cover_letter,
        cv_url: finalCvUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select(`
        id,
        post_id,
        cover_letter,
        cv_url,
        status,
        created_at,
        posts (
          id,
          title,
          companies (
            name
          )
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Application submitted successfully',
      application: data
    });

  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * GET /api/posts/:id/applications
 * Get applications for a specific job post (company/admin only)
 */
router.get('/:id/applications', authenticateToken, requireRole(['company', 'admin']), async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Check if user has permission to view applications for this post
    if (req.user.role === 'company') {
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('created_by')
        .eq('id', postId)
        .single();

      if (!post || post.created_by !== req.user.id) {
        return res.status(403).json({ 
          error: 'You can only view applications for your own job posts' 
        });
      }
    }

    let query = supabaseAdmin
      .from('applications')
      .select(`
        id,
        cover_letter,
        cv_url,
        status,
        notes,
        created_at,
        users (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `, { count: 'exact' })
      .eq('post_id', postId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    res.json({
      applications: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * PATCH /api/posts/:id/applications/:applicationId
 * Update application status (company/admin only)
 */
router.patch('/:id/applications/:applicationId', authenticateToken, requireRole(['company', 'admin']), async (req, res) => {
  try {
    const { id: postId, applicationId } = req.params;
    const { status, notes } = req.body;

    // Validation
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    // Check if user has permission to update applications for this post
    if (req.user.role === 'company') {
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('created_by')
        .eq('id', postId)
        .single();

      if (!post || post.created_by !== req.user.id) {
        return res.status(403).json({ 
          error: 'You can only update applications for your own job posts' 
        });
      }
    }

    // Update application
    const { data, error } = await supabaseAdmin
      .from('applications')
      .update({
        status,
        notes,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .eq('post_id', postId)
      .select(`
        id,
        status,
        notes,
        reviewed_at,
        users (
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      message: 'Application status updated successfully',
      application: data
    });

  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

export default router;
