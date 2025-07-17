// User Types
export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    addresses: Address[];
    preferences: UserPreferences;
    orderHistory: string[];
    wishlist: string[];
    role: 'user' | 'admin';
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Address {
    _id?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    label?: string; // 'Home', 'Work', etc.
  }
  
  export interface UserPreferences {
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
    brands: string[];
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  }
  
  // Product Types
  export interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
    category: Category;
    brand: string;
    stock: number;
    sku: string;
    attributes: ProductAttribute[];
    specifications: { [key: string]: string };
    tags: string[];
    ratings: {
      average: number;
      count: number;
    };
    reviews: Review[];
    isActive: boolean;
    isFeatured: boolean;
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
      startDate: Date;
      endDate: Date;
    };
    seoData: {
      metaTitle: string;
      metaDescription: string;
      slug: string;
    };
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Category {
    _id: string;
    name: string;
    description: string;
    image?: string;
    parent?: string;
    slug: string;
    isActive: boolean;
    products: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ProductAttribute {
    name: string;
    value: string;
    type: 'color' | 'size' | 'material' | 'other';
  }
  
  export interface Review {
    _id: string;
    user: User;
    product: string;
    rating: number;
    title: string;
    comment: string;
    images?: string[];
    helpful: number;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // Cart Types
  export interface CartItem {
    product: Product;
    quantity: number;
    selectedAttributes?: { [key: string]: string };
    addedAt: Date;
  }
  
  export interface Cart {
    items: CartItem[];
    totalItems: number;
    totalPrice: number;
    lastUpdated: Date;
  }
  
  // Order Types
  export interface Order {
    _id: string;
    orderNumber: string;
    user: User;
    items: OrderItem[];
    shippingAddress: Address;
    billingAddress: Address;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    timeline: OrderTimeline[];
    pricing: OrderPricing;
    notes?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface OrderItem {
    product: Product;
    quantity: number;
    price: number;
    selectedAttributes?: { [key: string]: string };
  }
  
  export interface OrderPricing {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  }
  
  export interface OrderTimeline {
    status: OrderStatus;
    message: string;
    timestamp: Date;
    location?: string;
  }
  
  export type OrderStatus = 
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  
  export type PaymentStatus = 
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded'
    | 'cancelled';
  
  export type PaymentMethod = 
    | 'mpesa'
    | 'card'
    | 'bank_transfer'
    | 'cash_on_delivery';
  
  // Payment Types
  export interface Payment {
    _id: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
    mpesaReceiptNumber?: string;
    phoneNumber?: string;
    failureReason?: string;
    metadata?: { [key: string]: any };
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface MpesaCallbackData {
    Body: {
      stkCallback: {
        MerchantRequestID: string;
        CheckoutRequestID: string;
        ResultCode: number;
        ResultDesc: string;
        CallbackMetadata?: {
          Item: Array<{
            Name: string;
            Value: string | number;
          }>;
        };
      };
    };
  }
  
  // Recommendation Types
  export interface RecommendationData {
    productId: string;
    score: number;
    reason: string;
    type: 'similar' | 'collaborative' | 'trending' | 'personal';
  }
  
  export interface UserInteraction {
    _id: string;
    userId: string;
    productId: string;
    type: 'view' | 'cart' | 'purchase' | 'like' | 'share';
    metadata?: { [key: string]: any };
    timestamp: Date;
  }
  
  // API Response Types
  export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }
  
  export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  export interface ProductFilters extends PaginationQuery {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    search?: string;
    tags?: string[];
    inStock?: boolean;
    featured?: boolean;
  }
  
  // Auth Types
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }
  
  export interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
  }
  
  // Socket Event Types
  export interface SocketEvents {
    // Order events
    'order:created': Order;
    'order:updated': Order;
    'order:status_changed': {
      orderId: string;
      status: OrderStatus;
      message: string;
    };
    
    // Product events
    'product:stock_updated': {
      productId: string;
      stock: number;
    };
    
    // User events
    'user:online': string;
    'user:offline': string;
  }
  
  // Error Types
  export interface ValidationError {
    field: string;
    message: string;
    value?: any;
  }
  
  export interface ApiError {
    message: string;
    statusCode: number;
    errors?: ValidationError[];
    stack?: string;
  }