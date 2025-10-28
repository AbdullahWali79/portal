import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

/**
 * GET /api/admin/companies
 * Admin list pending companies
 */
router.get('/companies', async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Validation
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status as string)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    const { data, error, count } = await supabaseAdmin
      .from('companies')
      .select(`
        id,
        name,
        description,
        website,
        industry,
        size,
        location,
        contact_email,
        contact_phone,
        logo_url,
        status,
        admin_notes,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    res.json({
      companies: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * POST /api/admin/companies/:id/approve
 * Admin approves company (sets approved=true)
 */
router.post('/companies/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'approved', admin_notes } = req.body;

    // Validation
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    // Check if company exists
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Update company status
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({
        status,
        admin_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        website,
        industry,
        size,
        location,
        status,
        admin_notes,
        updated_at
      `)
      .single();

    if (error) throw error;

    res.json({
      message: `Company ${status} successfully`,
      company: data
    });

  } catch (error) {
    console.error('Error updating company status:', error);
    res.status(500).json({ error: 'Failed to update company status' });
  }
});

/**
 * GET /api/admin/posts
 * Admin list and manage all posts
 */
router.get('/posts', async (req, res) => {
  try {
    const { 
      status = 'all', 
      company_id, 
      page = 1, 
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Validation
    const validStatuses = ['all', 'active', 'expired', 'inactive'];
    if (!validStatuses.includes(status as string)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    let query = supabaseAdmin
      .from('posts')
      .select(`
        id,
        title,
        description,
        location,
        employment_type,
        experience_level,
        salary_min,
        salary_max,
        currency,
        is_active,
        expires_at,
        created_at,
        updated_at,
        companies (
          id,
          name,
          logo_url
        )
      `, { count: 'exact' });

    // Apply filters
    if (status === 'active') {
      query = query.eq('is_active', true).gt('expires_at', new Date().toISOString());
    } else if (status === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (company_id) {
      query = query.eq('company_id', company_id);
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
      }
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * DELETE /api/admin/posts/:id
 * Admin delete post
 */
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, title')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete post
    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Post deleted successfully',
      deleted_post: {
        id: existingPost.id,
        title: existingPost.title
      }
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * POST /api/admin/posts
 * Create a new job post with admin time limit control
 */
router.post('/posts', async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      benefits,
      salary_min,
      salary_max,
      currency = 'USD',
      location,
      remote_ok = false,
      employment_type,
      experience_level,
      contact_email,
      contact_phone,
      image_url,
      company_id,
      daysLimit = 30 // Default 30 days
    } = req.body;

    // Validation
    if (!title || !description || !location || !employment_type || !experience_level || !company_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description', 'location', 'employment_type', 'experience_level', 'company_id']
      });
    }

    if (daysLimit < 1 || daysLimit > 365) {
      return res.status(400).json({
        error: 'Days limit must be between 1 and 365'
      });
    }

    // Check if company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, status')
      .eq('id', company_id)
      .single();

    if (companyError) throw companyError;
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysLimit);

    // Create job post
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert([{
        title,
        description,
        requirements,
        benefits,
        salary_min,
        salary_max,
        currency,
        location,
        remote_ok,
        employment_type,
        experience_level,
        contact_email,
        contact_phone,
        image_url,
        company_id,
        created_by: req.user.id,
        is_active: true,
        visible: true,
        expires_at: expiryDate.toISOString(),
        created_at: new Date().toISOString()
      }])
      .select(`
        id,
        title,
        description,
        location,
        employment_type,
        experience_level,
        salary_min,
        salary_max,
        currency,
        visible,
        expires_at,
        created_at,
        companies (
          id,
          name,
          logo_url
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Job post created successfully with admin time limit control',
      post: data,
      time_limit: {
        days_limit: daysLimit,
        expires_at: expiryDate.toISOString(),
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating admin post:', error);
    res.status(500).json({ error: 'Failed to create job post' });
  }
});

/**
 * POST /api/admin/posts/:id/extend
 * Extend expiry by N days
 */
router.post('/posts/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;
    const { extraDays = 30 } = req.body;

    // Validation
    if (extraDays < 1 || extraDays > 365) {
      return res.status(400).json({
        error: 'Extra days must be between 1 and 365'
      });
    }

    // Check if post exists
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, title, expires_at, visible')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Calculate new expiry date
    const currentExpiry = new Date(existingPost.expires_at);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + extraDays);

    // Update post
    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        expires_at: newExpiry.toISOString(),
        visible: true, // Make visible again when extended
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        title,
        visible,
        expires_at,
        updated_at,
        companies (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    res.json({
      message: `Post expiry extended by ${extraDays} days`,
      post: data,
      extension_details: {
        previous_expiry: existingPost.expires_at,
        new_expiry: newExpiry.toISOString(),
        days_added: extraDays,
        was_visible: existingPost.visible,
        now_visible: true
      }
    });

  } catch (error) {
    console.error('Error extending post:', error);
    res.status(500).json({ error: 'Failed to extend post' });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get company stats
    const { count: pendingCompanies } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: approvedCompanies } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Get post stats
    const { count: totalPosts } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true });

    const { count: activePosts } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    const { count: expiredPosts } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString());

    // Get application stats
    const { count: totalApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true });

    res.json({
      companies: {
        pending: pendingCompanies || 0,
        approved: approvedCompanies || 0,
        total: (pendingCompanies || 0) + (approvedCompanies || 0)
      },
      posts: {
        total: totalPosts || 0,
        active: activePosts || 0,
        expired: expiredPosts || 0
      },
      applications: {
        total: totalApplications || 0
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

export default router;
