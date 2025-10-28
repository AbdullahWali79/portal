/**
 * Cron Configuration for JobPortal
 * 
 * This file configures automated jobs using node-cron
 * Run with: node backend/cron-config.js
 */

const cron = require('node-cron');
const { expirePosts, getPostStats } = require('./src/jobs/expirePosts');

console.log('🕐 Starting JobPortal Cron Jobs...');

// Expire posts every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('\n🔄 Running scheduled post expiration job...');
  const result = await expirePosts();
  
  if (result.success) {
    console.log(`✅ Scheduled job completed: ${result.message}`);
  } else {
    console.error(`❌ Scheduled job failed: ${result.message}`);
  }
}, {
  scheduled: true,
  timezone: "UTC"
});

// Daily statistics report at 9 AM UTC
cron.schedule('0 9 * * *', async () => {
  console.log('\n📊 Running daily statistics report...');
  const stats = await getPostStats();
  
  if (stats) {
    console.log('📈 Daily Post Statistics:');
    console.log(`   Total Posts: ${stats.totalPosts}`);
    console.log(`   Visible Posts: ${stats.visiblePosts}`);
    console.log(`   Expired Posts: ${stats.expiredPosts}`);
    console.log(`   Expiring Soon (24h): ${stats.expiringSoon}`);
  }
}, {
  scheduled: true,
  timezone: "UTC"
});

// Weekly cleanup job (Sundays at 2 AM UTC)
cron.schedule('0 2 * * 0', async () => {
  console.log('\n🧹 Running weekly cleanup job...');
  
  // Get stats before cleanup
  const beforeStats = await getPostStats();
  
  // Run expiration job
  const result = await expirePosts();
  
  // Get stats after cleanup
  const afterStats = await getPostStats();
  
  console.log('🧹 Weekly Cleanup Summary:');
  console.log(`   Before: ${beforeStats?.visiblePosts || 0} visible posts`);
  console.log(`   After: ${afterStats?.visiblePosts || 0} visible posts`);
  console.log(`   Expired: ${result.expiredCount || 0} posts`);
}, {
  scheduled: true,
  timezone: "UTC"
});

console.log('✅ Cron jobs scheduled:');
console.log('   - Post expiration: Every 6 hours');
console.log('   - Daily stats: 9:00 AM UTC');
console.log('   - Weekly cleanup: Sundays 2:00 AM UTC');
console.log('\nPress Ctrl+C to stop the cron jobs...');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Stopping cron jobs...');
  process.exit(0);
});
