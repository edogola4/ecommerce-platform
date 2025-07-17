import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import { Order as IOrder, OrderItem, OrderPricing, OrderTimeline, OrderStatus, PaymentStatus, PaymentMethod, Address } from '@/shared/types';

// Extend the Order interface to include Document methods and additional fields
export interface OrderDocument extends Omit<IOrder, '_id'>, Document {
  generateOrderNumber(): string;
  updateStatus(status: OrderStatus, message?: string): Promise<void>;
  calculateTotals(): OrderPricing;
  canBeCancelled(): boolean;
  canBeReturned(): boolean;
  getStatusMessage(status: OrderStatus): string; // Added to match schema method
  couponCode?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  deliveryInstructions?: string;
}

const addressSchema = new Schema<Address>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Kenya' },
  isDefault: { type: Boolean, default: false },
  label: { type: String }
});

const orderItemSchema = new Schema<OrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  selectedAttributes: {
    type: Map,
    of: String,
    default: new Map()
  }
});

const orderPricingSchema = new Schema<OrderPricing>({
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  }
});

const orderTimelineSchema = new Schema<OrderTimeline>({
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: String
});

const orderSchema = new Schema<OrderDocument>({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: addressSchema,
    required: true
  },
  billingAddress: {
    type: addressSchema,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'bank_transfer', 'cash_on_delivery'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  timeline: [orderTimelineSchema],
  pricing: {
    type: orderPricingSchema,
    required: true
  },
  notes: String,
  trackingNumber: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  couponCode: String,
  deliveryInstructions: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ user: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.product': 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', function(this: OrderDocument, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.generateOrderNumber();
  }
  next();
});

// Pre-save middleware to add initial timeline entry
orderSchema.pre('save', function(this: OrderDocument, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew) {
    this.timeline.push({
      status: 'pending',
      message: 'Order has been placed',
      timestamp: new Date()
    });
  }
  next();
});

// Instance method to generate order number
orderSchema.methods.generateOrderNumber = function(this: OrderDocument): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp.slice(-8)}-${random}`;
};

// Instance method to update order status
orderSchema.methods.updateStatus = async function(this: OrderDocument, status: OrderStatus, message?: string): Promise<void> {
  this.orderStatus = status;
  
  const timelineEntry = {
    status,
    message: message || this.getStatusMessage(status),
    timestamp: new Date()
  };
  
  this.timeline.push(timelineEntry);
  
  // Update delivery date if delivered
  if (status === 'delivered' && !this.actualDelivery) {
    this.actualDelivery = new Date();
  }
  
  await this.save();
};

// Helper method to get default status messages
orderSchema.methods.getStatusMessage = function(this: OrderDocument, status: OrderStatus): string {
  const messages = {
    pending: 'Order is pending confirmation',
    confirmed: 'Order has been confirmed',
    processing: 'Order is being processed',
    shipped: 'Order has been shipped',
    delivered: 'Order has been delivered',
    cancelled: 'Order has been cancelled',
    refunded: 'Order has been refunded'
  };
  return messages[status] || 'Status updated';
};

// Instance method to calculate totals
orderSchema.methods.calculateTotals = function(this: OrderDocument): OrderPricing {
  const subtotal = this.items.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.16; // 16% VAT in Kenya
  const shipping = subtotal > 5000 ? 0 : 200; // Free shipping above KES 5000
  const total = subtotal + tax + shipping - (this.pricing?.discount || 0);
  
  return {
    subtotal,
    tax,
    shipping,
    discount: this.pricing?.discount || 0,
    total
  };
};

// Instance method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function(this: OrderDocument): boolean {
  const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing'];
  return cancellableStatuses.includes(this.orderStatus);
};

// Instance method to check if order can be returned
orderSchema.methods.canBeReturned = function(this: OrderDocument): boolean {
  if (this.orderStatus !== 'delivered' || !this.actualDelivery) return false;
  
  const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const timeSinceDelivery = Date.now() - this.actualDelivery.getTime();
  
  return timeSinceDelivery <= returnWindow;
};

// Static method to find orders by user
orderSchema.statics.findByUser = function(this: mongoose.Model<OrderDocument>, userId: string) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

// Static method to find recent orders
orderSchema.statics.findRecent = function(this: mongoose.Model<OrderDocument>, limit: number = 10) {
  return this.find({}).sort({ createdAt: -1 }).limit(limit);
};

// Static method to get order statistics
orderSchema.statics.getStatistics = async function(this: mongoose.Model<OrderDocument>) {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        totalValue: { $sum: '$pricing.total' }
      }
    }
  ]);
  
  return stats;
};

export const Order = mongoose.model<OrderDocument>('Order', orderSchema);