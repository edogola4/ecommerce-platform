"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const productAttributeSchema = new mongoose_1.Schema({
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
const productSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product category is required']
    },
    brand: {
        type: String,
        required: [true, 'Product brand is required'],
        trim: true,
        maxlength: [100, 'Brand name cannot exceed 100 characters']
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
            type: Number,
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
            type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
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
productSchema.virtual('discountedPrice').get(function () {
    return this.calculateDiscountedPrice();
});
productSchema.virtual('discountPercentage').get(function () {
    if (!this.originalPrice || this.originalPrice <= this.price)
        return 0;
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});
productSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.seoData?.slug) {
        this.seoData = this.seoData || {};
        this.seoData.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});
productSchema.methods.calculateDiscountedPrice = function () {
    if (!this.discount)
        return this.price;
    const now = new Date();
    if (this.discount.startDate && now < this.discount.startDate)
        return this.price;
    if (this.discount.endDate && now > this.discount.endDate)
        return this.price;
    if (this.discount.type === 'percentage') {
        return this.price * (1 - this.discount.value / 100);
    }
    else if (this.discount.type === 'fixed') {
        return Math.max(0, this.price - this.discount.value);
    }
    return this.price;
};
productSchema.methods.updateRating = async function (newRating) {
    const totalRating = (this.ratings.average * this.ratings.count) + newRating;
    this.ratings.count += 1;
    this.ratings.average = totalRating / this.ratings.count;
    await this.save();
};
productSchema.methods.isInStock = function () {
    return this.stock > 0;
};
productSchema.methods.addToStock = async function (quantity) {
    this.stock += quantity;
    await this.save();
};
productSchema.methods.reduceStock = async function (quantity) {
    if (this.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
    await this.save();
};
productSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};
productSchema.statics.findFeatured = function () {
    return this.find({ isFeatured: true, isActive: true });
};
productSchema.statics.findByCategory = function (categoryId) {
    return this.find({ category: categoryId, isActive: true });
};
productSchema.statics.searchProducts = function (searchTerm) {
    return this.find({
        $text: { $search: searchTerm },
        isActive: true
    }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
};
exports.Product = mongoose_1.default.model('Product', productSchema);
//# sourceMappingURL=Product.js.map