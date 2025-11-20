const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testUserCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital');
    
    const testUser = {
      name: 'Test Doctor',
      username: 'testdoctor@hospital.com',
      password: 'test1234',
      role: 'doctor'
    };
    
    console.log('Attempting to create test user:', testUser);
    const user = await User.create(testUser);
    console.log('Success! Created user:', user);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Test failed:', {
      message: err.message,
      stack: err.stack,
      errors: err.errors
    });
    process.exit(1);
  }
}

testUserCreation();
