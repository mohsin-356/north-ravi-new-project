const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital');
    
    const adminExists = await User.findOne({ username: 'admin@hospital.com' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    const admin = await User.create({
      name: 'System Admin',
      username: 'admin@hospital.com',
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('Admin user created successfully:', admin);
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();
