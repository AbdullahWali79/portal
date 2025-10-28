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
 * POST /api/companies/request
 * Create company signup request (company info stored with approved=false)
 */
router.post('/request', async (req, res) => {
  try {
    const {
      name,
      description,
      website,
      industry,
      size,
      location,
      contact_email,
      contact_phone,
      logo_url
    } = req.body;

    // Validation
    if (!name || !description || !contact_email || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'description', 'contact_email', 'location']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if company already exists
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCompany) {
      return res.status(409).json({
        error: 'Company with this name already exists'
      });
    }

    // Create company request
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert([{
        name,
        description,
        website,
        industry,
        size,
        location,
        contact_email,
        contact_phone,
        logo_url,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Company request submitted successfully',
      company: {
        id: data.id,
        name: data.name,
        status: data.status,
        created_at: data.created_at
      }
    });

  } catch (error) {
    console.error('Error creating company request:', error);
    res.status(500).json({ error: 'Failed to create company request' });
  }
});

/**
 * GET /api/companies/status/:id
 * Check company approval status
 */
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, status, admin_notes, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({
      company: {
        id: data.id,
        name: data.name,
        status: data.status,
        admin_notes: data.admin_notes,
        created_at: data.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching company status:', error);
    res.status(500).json({ error: 'Failed to fetch company status' });
  }
});

/**
 * POST /api/companies/:id/posts
 * Company (approved) creates post
 */
router.post('/:id/posts', async (req, res) => {
  try {
    const { id: companyId } = req.params;
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
      days_to_expire = 30
    } = req.body;

    // Validation
    if (!title || !description || !location || !employment_type || !experience_level) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description', 'location', 'employment_type', 'experience_level']
      });
    }

    // Check if company exists and is approved
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, status')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.status !== 'approved') {
      return res.status(403).json({ 
        error: 'Company must be approved to create job posts',
        current_status: company.status
      });
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days_to_expire);

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
        company_id: companyId,
        created_by: companyId, // Using company ID as creator
        is_active: true,
        expires_at: expiryDate.toISOString(),
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        companies (
          id,
          name,
          logo_url,
          location
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Job post created successfully',
      post: data
    });

  } catch (error) {
    console.error('Error creating job post:', error);
    res.status(500).json({ error: 'Failed to create job post' });
  }
});

export default router;
