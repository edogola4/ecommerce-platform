import mongoose, { Document } from 'mongoose';
import { User as IUser } from '@/shared/types';
export interface UserDocument extends Omit<IUser, '_id'>, Document {
    comparePassword(candidatePassword: string): Promise<boolean>;
    getRecommendationData(): any;
    password: string;
    emailVerificationToken?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    lastLogin?: Date;
    isActive: boolean;
}
export declare const User: mongoose.Model<UserDocument, {}, {}, {}, mongoose.Document<unknown, {}, UserDocument, {}> & UserDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map