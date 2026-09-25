import dns from 'dns';
import mongoose from 'mongoose';
import envConfig from './env.js';

// Resolve MongoDB SRV records via public DNS if local ISP/router DNS fails
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

const connectDB = async () => {
    try{
      await mongoose.connect(envConfig.MONGO_URI);
      console.log('MongoDB connected successfully');

    }catch(err){
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    }

};
export default connectDB;