const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../modules/users/user.model');

async function fixDuplicatePhones() {
  await mongoose.connect(env.mongoUri);

  // Find all users with phone: null
  const usersWithNullPhone = await User.find({ phone: null }).select('_id email');
  console.log(`Found ${usersWithNullPhone.length} users with null phone`);

  if (usersWithNullPhone.length > 1) {
    // Keep the first one, update others to have unique phone
    for (let i = 1; i < usersWithNullPhone.length; i++) {
      const user = usersWithNullPhone[i];
      await User.findByIdAndUpdate(user._id, { phone: `${user.email}-phone` });
      console.log(`Updated user ${user.email} with phone: ${user.email}-phone`);
    }
  }

  await mongoose.disconnect();
}

fixDuplicatePhones().catch(console.error);