const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { connectDatabase } = require('../config/db');
const User = require('../modules/users/user.model');

async function seedAdmin() {
  await connectDatabase();

  const email = (process.env.ADMIN_EMAIL || env.adminEmail || 'admin@cuescore.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || env.adminPassword || 'Admin@123456';
  const fullName = process.env.ADMIN_NAME || env.adminName || 'CueScore Admin';

  const existingUser = await User.findOne({ email, deletedAt: null }).select('+passwordHash');
  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser) {
    existingUser.fullName = fullName;
    existingUser.role = 'admin';
    existingUser.status = 'active';
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
    console.log(`Updated admin user: ${email}`);
  } else {
    await User.create({
      fullName,
      email,
      passwordHash,
      role: 'admin',
      status: 'active',
    });
    console.log(`Created admin user: ${email}`);
  }

  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user', error);
  process.exit(1);
});
