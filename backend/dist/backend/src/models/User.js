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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const addressSchema = new mongoose_1.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'Kenya' },
    isDefault: { type: Boolean, default: false },
    label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' }
});
const userPreferencesSchema = new mongoose_1.Schema({
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
const userSchema = new mongoose_1.Schema({
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
        select: false
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Order'
        }],
    wishlist: [{
            type: mongoose_1.Schema.Types.ObjectId,
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
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
        this.password = await bcryptjs_1.default.hash(this.password, saltRounds);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcryptjs_1.default.compare(candidatePassword, this.password);
    }
    catch (error) {
        throw new Error('Password comparison failed');
    }
};
userSchema.methods.getRecommendationData = function () {
    return {
        preferences: this.preferences,
        orderHistory: this.orderHistory,
        wishlist: this.wishlist
    };
};
userSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        await mongoose_1.default.model('Order').deleteMany({ user: this._id });
        await mongoose_1.default.model('Review').deleteMany({ user: this._id });
        await mongoose_1.default.model('UserInteraction').deleteMany({ userId: this._id });
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.User = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map