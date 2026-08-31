require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const email = 'superadmin@universe.com';
        const password = 'SuperSecurePassword123!';
        const name = 'UniVerse Creators';

        const existingAdmin = await Admin.findOne({ email });
        
        if (existingAdmin) {
             console.log('Super Admin account already exists!');
             process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const superAdmin = new Admin({
             name,
             email,
             password: hashedPassword,
             role: 'superadmin'
        });

        await superAdmin.save();
        console.log('\n✅ Super Admin account created successfully!');
        console.log('------------------------------------------------');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('------------------------------------------------\n');
        
        process.exit(0);

    } catch (err) {
        console.error('Error creating super admin:', err);
        process.exit(1);
    }
};

run();
