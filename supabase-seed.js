#!/usr/bin/env node

/**
 * Supabase Database Seeder
 * 
 * This script creates an initial admin user and sets up the database
 * with proper roles and permissions.
 * 
 * Usage:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment
 * 2. Run: node supabase-seed.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env file or environment.');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Admin user data
const adminUser = {
  email: 'admin@jobportal.com',
  password: 'Admin123!@#',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  phone: '+1-555-0123'
};

async function createAdminUser() {
  try {
    console.log('🚀 Starting database seeding...\n');

    // Step 1: Create auth user
    console.log('1️⃣ Creating admin user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
        role: adminUser.role
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('   ⚠️  Admin user already exists in Auth');
        // Get existing user
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(adminUser.email);
        if (existingUser.user) {
          adminUser.id = existingUser.user.id;
        }
      } else {
        throw authError;
      }
    } else {
      adminUser.id = authData.user.id;
      console.log('   ✅ Admin user created in Auth');
    }

    // Step 2: Create user record in users table
    console.log('2️⃣ Creating admin user record in users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
        role: adminUser.role,
        phone: adminUser.phone,
        password_hash: 'managed_by_auth' // Auth handles password hashing
      }, {
        onConflict: 'id'
      })
      .select();

    if (userError) {
      throw userError;
    }

    console.log('   ✅ Admin user record created in users table');

    // Step 3: Create sample company
    console.log('3️⃣ Creating sample company...');
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .upsert({
        id: '00000000-0000-0000-0000-000000000002',
        name: 'TechCorp Inc.',
        description: 'Leading technology company specializing in innovative solutions',
        website: 'https://techcorp.com',
        industry: 'Technology',
        size: '500-1000',
        location: 'San Francisco, CA',
        status: 'approved',
        created_by: adminUser.id
      }, {
        onConflict: 'id'
      })
      .select();

    if (companyError) {
      throw companyError;
    }

    console.log('   ✅ Sample company created');

    // Step 4: Create company user
    console.log('4️⃣ Creating company user...');
    const companyUser = {
      email: 'company@techcorp.com',
      password: 'Company123!@#',
      first_name: 'Company',
      last_name: 'Admin',
      role: 'company',
      phone: '+1-555-0124'
    };

    const { data: companyAuthData, error: companyAuthError } = await supabase.auth.admin.createUser({
      email: companyUser.email,
      password: companyUser.password,
      email_confirm: true,
      user_metadata: {
        first_name: companyUser.first_name,
        last_name: companyUser.last_name,
        role: companyUser.role
      }
    });

    if (companyAuthError && !companyAuthError.message.includes('already registered')) {
      throw companyAuthError;
    }

    const companyUserId = companyAuthData?.user?.id || '00000000-0000-0000-0000-000000000003';

    const { error: companyUserError } = await supabase
      .from('users')
      .upsert({
        id: companyUserId,
        email: companyUser.email,
        first_name: companyUser.first_name,
        last_name: companyUser.last_name,
        role: companyUser.role,
        phone: companyUser.phone,
        password_hash: 'managed_by_auth'
      }, {
        onConflict: 'id'
      });

    if (companyUserError) {
      throw companyUserError;
    }

    console.log('   ✅ Company user created');

    // Step 5: Create job seeker user
    console.log('5️⃣ Creating job seeker user...');
    const jobSeekerUser = {
      email: 'candidate@example.com',
      password: 'Candidate123!@#',
      first_name: 'John',
      last_name: 'Doe',
      role: 'job_seeker',
      phone: '+1-555-0125'
    };

    const { data: candidateAuthData, error: candidateAuthError } = await supabase.auth.admin.createUser({
      email: jobSeekerUser.email,
      password: jobSeekerUser.password,
      email_confirm: true,
      user_metadata: {
        first_name: jobSeekerUser.first_name,
        last_name: jobSeekerUser.last_name,
        role: jobSeekerUser.role
      }
    });

    if (candidateAuthError && !candidateAuthError.message.includes('already registered')) {
      throw candidateAuthError;
    }

    const candidateUserId = candidateAuthData?.user?.id || '00000000-0000-0000-0000-000000000004';

    const { error: candidateUserError } = await supabase
      .from('users')
      .upsert({
        id: candidateUserId,
        email: jobSeekerUser.email,
        first_name: jobSeekerUser.first_name,
        last_name: jobSeekerUser.last_name,
        role: jobSeekerUser.role,
        phone: jobSeekerUser.phone,
        password_hash: 'managed_by_auth'
      }, {
        onConflict: 'id'
      });

    if (candidateUserError) {
      throw candidateUserError;
    }

    console.log('   ✅ Job seeker user created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Created Users:');
    console.log(`   👑 Admin: ${adminUser.email} (password: ${adminUser.password})`);
    console.log(`   🏢 Company: ${companyUser.email} (password: ${companyUser.password})`);
    console.log(`   👤 Job Seeker: ${jobSeekerUser.email} (password: ${jobSeekerUser.password})`);

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the seeder
createAdminUser();
