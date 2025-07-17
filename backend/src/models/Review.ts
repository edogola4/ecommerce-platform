import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import { Review as IReview } from '@/shared/types';

// Simplified interfaces to match IReview and populated fields
interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  [key: string]: any; // Allow additional fields
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  email: string;
  addresses: Address[]; // Updated to required Address[] to match IReview
  preferences?: any;
  orderHistory?: any[];
  wishlist: any[];
  role: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any; // Allow additional fields
}

interface Product {
  _id: string;
  name: string;
  images: string[];
  description?: string;
  [key: string]: any; // Allow additional fields from IReview
}

export interface ReviewDocument extends Omit<IReview, '_id'>, Document {
  user: User; // Align with IReview
  product: Product; // Align with IReview
  rating: number;
  title: string;
  comment: string;
  images: string[];
  helpful: number;
  helpfulBy: mongoose.Types.ObjectId[]; // Schema-specific
  verified: boolean;
  isApproved: boolean;
  moderatorNotes?: string;
  markAsHelpful(userId: string): Promise<void>;
  isVerifiedPurchase(): Promise<boolean>;
}

const reviewSchema = new Schema<ReviewDocument>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  images: [{
    type: String
  }],
  helpful: {
    type: Number,
    default: 0,
    min: [0, 'Helpful count cannot be negative']
  },
  helpfulBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  verified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  moderatorNotes: String
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.user = ret.user ? {
        _id: ret.user.toString(),
        firstName: ret.user.firstName,
        lastName: ret.user.lastName,
        avatar: ret.user.avatar,
        email: ret.user.email,
        addresses: ret.user.addresses,
        preferences: ret.user.preferences,
        orderHistory: ret.user.orderHistory,
        wishlist: ret.user.wishlist,
        role: ret.user.role,
        isEmailVerified: ret.user.isEmailVerified,
        createdAt: ret.user.createdAt,
        updatedAt: ret.user.updatedAt
      } : ret.user;
      ret.product = ret.product ? {
        _id: ret.product.toString(),
        name: ret.product.name,
        images: ret.product.images,
        description: ret.product.description
      } : ret.product;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ product: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verified: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index to ensure one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Pre-save middleware to check for verified purchase
reviewSchema.pre('save', async function(this: ReviewDocument, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew) {
    this.verified = await this.isVerifiedPurchase();
  }
  next();
});

// Post-save middleware to update product rating
reviewSchema.post('save', async function(this: ReviewDocument) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product._id);
  
  if (product) {
    const reviews = await mongoose.model('Review').find({ 
      product: this.product._id, 
      isApproved: true 
    });
    
    const totalRating = reviews.reduce((sum: number, review: ReviewDocument) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    product.ratings = {
      average: Math.round(averageRating * 10) / 10,
      count: reviews.length
    };
    
    await product.save();
  }
});

// Post-deleteOne middleware to update product rating
reviewSchema.post('deleteOne', { document: true, query: false }, async function(this: ReviewDocument) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product._id);
  
  if (product) {
    const reviews = await mongoose.model('Review').find({ 
      product: this.product._id, 
      isApproved: true 
    });
    
    const totalRating = reviews.reduce((sum: number, review: ReviewDocument) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    product.ratings = {
      average: Math.round(averageRating * 10) / 10,
      count: reviews.length
    };
    
    await product.save();
  }
});

// Instance method to mark review as helpful
reviewSchema.methods.markAsHelpful = async function(this: ReviewDocument, userId: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (!this.helpfulBy.includes(userObjectId)) {
    this.helpfulBy.push(userObjectId);
    this.helpful += 1;
    await this.save();
  }
};

// Instance method to check if review is from verified purchase
reviewSchema.methods.isVerifiedPurchase = async function(this: ReviewDocument): Promise<boolean> {
  const Order = mongoose.model('Order');
  const order = await Order.findOne({
    user: new mongoose.Types.ObjectId(this.user._id),
    'items.product': new mongoose.Types.ObjectId(this.product._id),
    orderStatus: 'delivered'
  });
  
  return !!order;
};

// Static method to find reviews by product
reviewSchema.statics.findByProduct = async function(this: mongoose.Model<ReviewDocument>, productId: string, approved: boolean = true): Promise<ReviewDocument[]> {
  const filter: { product: mongoose.Types.ObjectId; isApproved?: boolean } = { product: new mongoose.Types.ObjectId(productId) };
  if (approved) filter.isApproved = true;
  
  return this.find(filter)
    .populate('user', 'firstName lastName avatar email addresses preferences orderHistory wishlist role isEmailVerified createdAt updatedAt')
    .sort({ createdAt: -1 }) as Promise<ReviewDocument[]>;
};

// Static method to find reviews by user
reviewSchema.statics.findByUser = async function(this: mongoose.Model<ReviewDocument>, userId: string): Promise<ReviewDocument[]> {
  return this.find({ user: new mongoose.Types.ObjectId(userId) })
    .populate('product', 'name images description')
    .sort({ createdAt: -1 }) as Promise<ReviewDocument[]>;
};

// Static method to get review statistics for a product
reviewSchema.statics.getProductReviewStats = async function(this: mongoose.Model<ReviewDocument>, productId: string): Promise<{
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  percentageDistribution: Record<string, number>;
}> {
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
  
  const totalReviews = stats.reduce((sum: number, stat: { count: number }) => sum + stat.count, 0);
  const ratingDistribution: Record<number, number> = {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  };
  
  stats.forEach(stat => {
    ratingDistribution[stat._id] = stat.count;
  });
  
  return {
    totalReviews,
    ratingDistribution,
    percentageDistribution: Object.entries(ratingDistribution).reduce((acc, [rating, count]) => {
      acc[rating] = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
      return acc;
    }, {} as Record<string, number>)
  };
};

export const Review = mongoose.model<ReviewDocument>('Review', reviewSchema);