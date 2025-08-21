module.exports = {
  // Production environment configuration
  production: {
    // Database
    mongoOptions: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    },
    
    // CORS settings for production
    cors: {
      origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
      credentials: true,
      optionsSuccessStatus: 200,
    },
    
    // Security settings
    security: {
      jwtExpiresIn: '24h',
      bcryptRounds: 12,
      maxPayloadSize: '50mb',
    },
    
    // Email settings
    email: {
      timeout: 10000,
      retries: 3,
    },
    
    // Logging
    logging: {
      level: 'info',
      enableRequestLogging: true,
    },
  },
  
  // Development environment configuration
  development: {
    mongoOptions: {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    },
    
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
    
    security: {
      jwtExpiresIn: '7d',
      bcryptRounds: 10,
      maxPayloadSize: '50mb',
    },
    
    email: {
      timeout: 5000,
      retries: 1,
    },
    
    logging: {
      level: 'debug',
      enableRequestLogging: true,
    },
  }
};
