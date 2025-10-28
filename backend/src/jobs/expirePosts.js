#!/usr/bin/env node

/**
 * Cron Job: Expire Posts
 * 
 * This job runs periodically to hide posts whose expiry date has passed.
 * It sets visible=false for posts where expiry_date < NOW().
 * 
 * Usage:
 * - Run manually: node backend/src/jobs/expirePosts.js
 * - Schedule with cron: 0 */6 * * * (every 6 hours)
 * - Or use a job scheduler like node-cron
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Main function to expire posts
 */
async function expirePosts() {
  const startTime = new Date();
  console.log(`🕐 Starting post expiration job at ${startTime.toISOString()}`);

  try {
    // Find posts that should be expired
    const { data: expiredPosts, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        expires_at,
        visible,
        companies (
          name
        )
      `)
      .eq('visible', true)
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch expired posts: ${fetchError.message}`);
    }

    if (!expiredPosts || expiredPosts.length === 0) {
      console.log('✅ No posts found that need to be expired');
      return {
        success: true,
        expiredCount: 0,
        message: 'No posts expired'
      };
    }

    console.log(`📋 Found ${expiredPosts.length} posts to expire`);

    // Log the posts that will be expired
    expiredPosts.forEach(post => {
      console.log(`   - "${post.title}" (${post.companies?.name || 'Unknown Company'}) - Expired: ${post.expires_at}`);
    });

    // Update posts to set visible = false
    const { data: updatedPosts, error: updateError } = await supabase
      .from('posts')
      .update({
        visible: false,
        updated_at: new Date().toISOString()
      })
      .in('id', expiredPosts.map(p => p.id))
      .select('id, title, visible, expires_at');

    if (updateError) {
      throw new Error(`Failed to update expired posts: ${updateError.message}`);
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(`✅ Successfully expired ${updatedPosts.length} posts in ${duration}ms`);
    console.log(`🕐 Job completed at ${endTime.toISOString()}`);

    return {
      success: true,
      expiredCount: updatedPosts.length,
      expiredPosts: updatedPosts,
      duration: duration,
      message: `Successfully expired ${updatedPosts.length} posts`
    };

  } catch (error) {
    console.error('❌ Error in expire posts job:', error.message);
    console.error('Full error:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to expire posts'
    };
  }
}

/**
 * Get statistics about posts
 */
async function getPostStats() {
  try {
    const now = new Date().toISOString();
    
    // Get total posts
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    // Get visible posts
    const { count: visiblePosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('visible', true);

    // Get expired posts (visible but past expiry)
    const { count: expiredPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('visible', true)
      .lt('expires_at', now);

    // Get posts expiring in next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { count: expiringSoon } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('visible', true)
      .gte('expires_at', now)
      .lte('expires_at', tomorrow.toISOString());

    return {
      totalPosts: totalPosts || 0,
      visiblePosts: visiblePosts || 0,
      expiredPosts: expiredPosts || 0,
      expiringSoon: expiringSoon || 0
    };

  } catch (error) {
    console.error('Error getting post stats:', error);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 JobPortal Post Expiration Job');
  console.log('================================');

  // Get initial stats
  const initialStats = await getPostStats();
  if (initialStats) {
    console.log('📊 Initial Statistics:');
    console.log(`   Total Posts: ${initialStats.totalPosts}`);
    console.log(`   Visible Posts: ${initialStats.visiblePosts}`);
    console.log(`   Expired Posts: ${initialStats.expiredPosts}`);
    console.log(`   Expiring Soon (24h): ${initialStats.expiringSoon}`);
    console.log('');
  }

  // Run the expiration job
  const result = await expirePosts();

  // Get final stats
  const finalStats = await getPostStats();
  if (finalStats) {
    console.log('📊 Final Statistics:');
    console.log(`   Total Posts: ${finalStats.totalPosts}`);
    console.log(`   Visible Posts: ${finalStats.visiblePosts}`);
    console.log(`   Expired Posts: ${finalStats.expiredPosts}`);
    console.log(`   Expiring Soon (24h): ${finalStats.expiringSoon}`);
  }

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error in main:', error);
    process.exit(1);
  });
}

module.exports = {
  expirePosts,
  getPostStats
};
