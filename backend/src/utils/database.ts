import mongoose from 'mongoose';
import { logger } from './logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      };

      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      logger.info('Successfully connected to MongoDB');
      
      this.setupEventListeners();
      
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    uptime: number;
    connections: number;
  }> {
    const isHealthy = this.getConnectionStatus();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      connections: mongoose.connections.length
    };
  }

  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error during MongoDB disconnection on app termination:', error);
        process.exit(1);
      }
    });
  }

  public async createIndexes(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB connection is not ready');
      }

      const db = mongoose.connection.db; // Type guard: db is defined

      await db.collection('products').createIndex({
        name: 'text',
        description: 'text',
        tags: 'text'
      }, {
        weights: {
          name: 10,
          description: 5,
          tags: 1
        },
        name: 'product_text_index'
      });

      await db.collection('stores').createIndex({
        location: '2dsphere'
      });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes:', error);
      throw error;
    }
  }

  public async seedDatabase(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB connection is not ready');
      }

      const db = mongoose.connection.db; // Type guard: db is defined

      const userCount = await db.collection('users').countDocuments();
      const productCount = await db.collection('products').countDocuments();
      
      if (userCount > 0 || productCount > 0) {
        logger.info('Database already contains data, skipping seed');
        return;
      }

      logger.info('Seeding database with initial data...');
      
      await this.seedCategories();
      await this.seedAdminUser();
      
      logger.info('Database seeded successfully');
    } catch (error) {
      logger.error('Error seeding database:', error);
      throw error;
    }
  }

  private async seedCategories(): Promise<void> {
    const Category = mongoose.model('Category');
    
    const categories = [
      {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        slug: 'electronics',
        isActive: true,
        sortOrder: 1
      },
      {
        name: 'Clothing',
        description: 'Fashion and apparel',
        slug: 'clothing',
        isActive: true,
        sortOrder: 2
      },
      {
        name: 'Home & Garden',
        description: 'Home improvement and garden supplies',
        slug: 'home-garden',
        isActive: true,
        sortOrder: 3
      },
      {
        name: 'Sports & Outdoors',
        description: 'Sports equipment and outdoor gear',
        slug: 'sports-outdoors',
        isActive: true,
        sortOrder: 4
      },
      {
        name: 'Books',
        description: 'Books and educational materials',
        slug: 'books',
        isActive: true,
        sortOrder: 5
      }
    ];

    await Category.insertMany(categories);
    logger.info('Categories seeded successfully');
  }

  private async seedAdminUser(): Promise<void> {
    const User = mongoose.model('User');
    
    const adminUser = {
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@ecommerce.com',
      password: 'Admin123!', // This will be hashed by the model
      role: 'admin',
      isEmailVerified: true,
      preferences: {
        categories: [],
        priceRange: { min: 0, max: 1000000 },
        brands: [],
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    };

    await User.create(adminUser);
    logger.info('Admin user created successfully');
  }
}

export const databaseService = DatabaseService.getInstance();