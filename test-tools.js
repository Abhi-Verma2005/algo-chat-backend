// Simple test script to verify backend tools
const testTools = async () => {
  try {
    // Test getUserContext tool
    console.log('🧪 Testing getUserContext tool...');
    const { getUserContextForPrompt } = require('./src/services/ai-actions');
    
    // Test with a mock user ID
    const result = await getUserContextForPrompt('test-user-123');
    console.log('✅ getUserContext result:', JSON.stringify(result, null, 2));
    
    // Test getTags tool
    console.log('\n🧪 Testing getTags tool...');
    const { getTags } = require('./src/services/ai-actions');
    const tags = await getTags();
    console.log('✅ getTags result:', JSON.stringify(tags, null, 2));
    
    // Test getUserProgress tool
    console.log('\n🧪 Testing getUserProgress tool...');
    const { getUserProgress } = require('./src/services/ai-actions');
    const progress = await getUserProgress('test-user-123', { timeRange: 'all' });
    console.log('✅ getUserProgress result:', JSON.stringify(progress, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testTools();
