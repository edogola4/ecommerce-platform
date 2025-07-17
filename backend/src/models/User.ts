import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User as IUser, Address, UserPreferences } from '@/shared/types';

// Extend the User interface to include Document methods and additional fields
export interface UserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  getRecommendationData(): any;
  password: string; // Added to match schema
  emailVerificationToken?: string; // Added to match schema
  passwordResetToken?: string; // Added to match schema
  passwordResetExpires?: Date; // Added to match schema
  lastLogin?: Date; // Added to match schema
  isActive: boolean; // Added to match schema
}

const addressSchema = new Schema<Address>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Kenya' },
  isDefault: { type: Boolean, default: false },
  label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' }
});

const userPreferencesSchema = new Schema<UserPreferences>({
  categories: [{ type: String }],
  priceRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 1000000 }
  },
  brands: [{ type: String }],
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  }
});

const userSchema = new Schema<UserDocument>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    match: [/^(\+254|254|0)[17]\d{8}$/, 'Please enter a valid Kenyan phone number']
  },
  avatar: {
    type: String,
    default: ''
  },
  addresses: [addressSchema],
  preferences: {
    type: userPreferencesSchema,
    default: () => ({})
  },
  orderHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Order'
  }],
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function(this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(this: UserDocument, next: CallbackWithoutResultAndOptionalError) {
  // Only hash password if it's been modified (or new)
  if (!this.isModified('password')) return next();

  try {
    // Hash the password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(this: UserDocument, candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to get recommendation data
userSchema.methods.getRecommendationData = function(this: UserDocument) {
  return {
    preferences: this.preferences,
    orderHistory: this.orderHistory,
    wishlist: this.wishlist
  };
};

// Static method to find active users
userSchema.statics.findActive = function(this: mongoose.Model<UserDocument>) {
  return this.find({ isActive: true });
};

// Static method to find by email
userSchema.statics.findByEmail = function(this: mongoose.Model<UserDocument>, email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Pre-deleteOne middleware to cleanup related data
userSchema.pre('deleteOne', { document: true, query: false }, async function(this: UserDocument, next: CallbackWithoutResultAndOptionalError) {
  try {
    // Remove user's orders, reviews, etc.
    await mongoose.model('Order').deleteMany({ user: this._id });
    await mongoose.model('Review').deleteMany({ user: this._id });
    await mongoose.model('UserInteraction').deleteMany({ userId: this._id });
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = mongoose.model<UserDocument>('User', userSchema);