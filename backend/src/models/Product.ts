import mongoose, { Schema, Document } from 'mongoose';
import { Product as IProduct, ProductAttribute } from '@/shared/types';

// Extend the Product interface to include Document methods and additional fields
export interface ProductDocument extends Omit<IProduct, '_id'>, Document {
  calculateDiscountedPrice(): number;
  updateRating(newRating: number): Promise<void>;
  isInStock(): boolean;
  addToStock(quantity: number): Promise<void>;
  reduceStock(quantity: number): Promise<void>;
  viewCount: number; // Added to match schema
  salesCount: number; // Added to match schema
}

const productAttributeSchema = new Schema<ProductAttribute>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  value: { 
    type: String, 
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['color', 'size', 'material', 'other'],
    default: 'other'
  }
});

const productSchema = new Schema<ProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price cannot be negative']
    },
    images: [{
      type: String,
      required: true
    }],
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required']
    },
    brand: {
      type: String,
      required: [true, 'Product brand is required'],
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'] // Fixed typo: mona -> maxlength
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    attributes: [productAttributeSchema],
    specifications: {
      type: Map,
      of: String,
      default: new Map()
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    ratings: {
      average: {
        type: Number, // Fixed typo: type: : Number -> type: Number
        default: 0,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5']
      },
      count: {
        type: Number,
        default: 0,
        min: [0, 'Rating count cannot be negative']
      }
    },
    reviews: [{
      type: Schema.Types.ObjectId,
      ref: 'Review'
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: {
        type: Number,
        min: [0, 'Discount value cannot be negative']
      },
      startDate: Date,
      endDate: Date
    },
    seoData: {
      metaTitle: {
        type: String,
        maxlength: [60, 'Meta title cannot exceed 60 characters']
      },
      metaDescription: {
        type: String,
        maxlength: [160, 'Meta description cannot exceed 160 characters']
      },
      slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
      }
    },
    viewCount: {
      type: Number,
      default: 0
    },
    salesCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ 'seoData.slug': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ salesCount: -1 });

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function(this: ProductDocument) {
  return this.calculateDiscountedPrice();
});

// Virtual for discount percentage (if original price exists)
productSchema.virtual('discountPercentage').get(function(this: ProductDocument) {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(this: ProductDocument, next) {
  if (this.isModified('name') && !this.seoData?.slug) {
    this.seoData = this.seoData || {};
    this.seoData.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Instance method to calculate discounted price
productSchema.methods.calculateDiscountedPrice = function(this: ProductDocument): number {
  if (!this.discount) return this.price;
  
  const now = new Date();
  if (this.discount.startDate && now < this.discount.startDate) return this.price;
  if (this.discount.endDate && now > this.discount.endDate) return this.price;
  
  if (this.discount.type === 'percentage') {
    return this.price * (1 - this.discount.value / 100);
  } else if (this.discount.type === 'fixed') {
    return Math.max(0, this.price - this.discount.value);
  }
  
  return this.price;
};

// Instance method to update rating
productSchema.methods.updateRating = async function(this: ProductDocument, newRating: number): Promise<void> {
  const totalRating = (this.ratings.average * this.ratings.count) + newRating;
  this.ratings.count += 1;
  this.ratings.average = totalRating / this.ratings.count;
  await this.save();
};

// Instance method to check if product is in stock
productSchema.methods.isInStock = function(this: ProductDocument): boolean {
  return this.stock > 0;
};

// Instance method to add stock
productSchema.methods.addToStock = async function(this: ProductDocument, quantity: number): Promise<void> {
  this.stock += quantity;
  await this.save();
};

// Instance method to reduce stock
productSchema.methods.reduceStock = async function(this: ProductDocument, quantity: number): Promise<void> {
  if (this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  await this.save();
};

// Static method to find active products
productSchema.statics.findActive = function(this: mongoose.Model<ProductDocument>) {
  return this.find({ isActive: true });
};

// Static method to find featured products
productSchema.statics.findFeatured = function(this: mongoose.Model<ProductDocument>) {
  return this.find({ isFeatured: true, isActive: true });
};

// Static method to find products by category
productSchema.statics.findByCategory = function(this: mongoose.Model<ProductDocument>, categoryId: string) {
  return this.find({ category: categoryId, isActive: true });
};

// Static method to search products
productSchema.statics.searchProducts = function(this: mongoose.Model<ProductDocument>, searchTerm: string) {
  return this.find(
    { 
      $text: { $search: searchTerm },
      isActive: true 
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

export const Product = mongoose.model<ProductDocument>('Product', productSchema);