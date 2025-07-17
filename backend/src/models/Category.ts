import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import { Category as ICategory } from '@/shared/types';

// Extend the Category interface to include Document methods and additional fields
export interface CategoryDocument extends Omit<ICategory, '_id'>, Document {
  getProductCount(): Promise<number>;
  getSubcategories(): Promise<CategoryDocument[]>;
  sortOrder: number; // Added to match schema
}

const categorySchema = new Schema<CategoryDocument>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    default: ''
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(this: CategoryDocument, next: CallbackWithoutResultAndOptionalError) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Instance method to get product count
categorySchema.methods.getProductCount = async function(this: CategoryDocument): Promise<number> {
  const Product = mongoose.model('Product');
  return await Product.countDocuments({ category: this._id, isActive: true });
};

// Instance method to get subcategories
categorySchema.methods.getSubcategories = async function(this: CategoryDocument): Promise<CategoryDocument[]> {
  return await mongoose.model('Category').find({ parent: this._id, isActive: true }).sort({ sortOrder: 1 });
};

// Static method to find root categories (no parent)
categorySchema.statics.findRootCategories = function(this: mongoose.Model<CategoryDocument>) {
  return this.find({ parent: null, isActive: true }).sort({ sortOrder: 1 });
};

// Static method to find category by slug
categorySchema.statics.findBySlug = function(this: mongoose.Model<CategoryDocument>, slug: string) {
  return this.findOne({ slug, isActive: true });
};

export const Category = mongoose.model<CategoryDocument>('Category', categorySchema);