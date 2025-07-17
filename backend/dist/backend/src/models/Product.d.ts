import mongoose, { Document } from 'mongoose';
import { Product as IProduct } from '@/shared/types';
export interface ProductDocument extends Omit<IProduct, '_id'>, Document {
    calculateDiscountedPrice(): number;
    updateRating(newRating: number): Promise<void>;
    isInStock(): boolean;
    addToStock(quantity: number): Promise<void>;
    reduceStock(quantity: number): Promise<void>;
    viewCount: number;
    salesCount: number;
}
export declare const Product: mongoose.Model<ProductDocument, {}, {}, {}, mongoose.Document<unknown, {}, ProductDocument, {}> & ProductDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Product.d.ts.map