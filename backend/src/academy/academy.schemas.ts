import { Schema } from 'mongoose';
import type { PriceFields } from './academy-pricing';
export type Access = 'public' | 'account' | 'enrolled';
export interface Lesson {
    id: string;
    title: string;
    description?: string;
    type: 'text' | 'video';
    access: Access;
    durationSeconds?: number;
    text?: string;
    file?: string;
    embedUrl?: string;
    resources: {
        id: string;
        title: string;
        file: string;
    }[];
}
export interface LearningCourse extends PriceFields {
    slug: string;
    enabled: boolean;
    purchaseEnabled?: boolean;
    accessTerms: string;
    benefits: string[];
    category?: string;
    description?: string;
    outcomes: string[];
    audience?: string;
    tools?: string[];
    gallery?: { src: string; alt: string }[];
    instructor?: {
        name: string;
        biography: string;
    };
    thumbnail?: { src: string; alt: string };
    previewVideoUrl?: string;
    modules: {
        id: string;
        title: string;
        lessons: Lesson[];
    }[];
    revision: number;
}
export interface Enrollment {
    userId: string;
    courseSlug: string;
    source: 'free' | 'scholarship' | 'admin' | 'payment';
    active: boolean;
    createdAt: Date;
}
export interface Scholarship {
    codeHash: string;
    label: string;
    courses: string[];
    anyCourse?: boolean;
    kind: 'percentage' | 'fixed' | 'full';
    amount?: number;
    amountMinor?: number;
    startsAt: Date;
    expiresAt?: Date;
    generationActor?: string;
    generationKey?: string;
    generationHash?: string;
    generationNonce?: string;
    generatedAt?: Date;
    totalLimit: number;
    perAccountLimit: number;
    minimumSpendMinor?: number;
    recipientEmail?: string;
    active: boolean;
    redeemed: number;
    revision: number;
}
export interface Redemption {
    codeId: string;
    userId: string;
    courseSlug: string;
    discountBDT?: number;
    discountMinor?: number;
    createdAt: Date;
}
export interface AcademyAudit {
    actor: string;
    action: string;
    target: string;
    createdAt: Date;
    reason?: string;
}
const nested = {
    _id: false, strict: true
} as const;
const resource = new Schema({
    id: String, title: String, file: String
}, nested);
const lesson = new Schema({
    id: String, title: String, description: String, type: {
        type: String, enum: ['text', 'video']
    }, access: {
        type: String, enum: ['public', 'account', 'enrolled']
    }, durationSeconds: Number, text: String, file: String, embedUrl: String, resources: [resource]
}, nested);
const learning = new Schema<LearningCourse>({
    slug: {
        type: String, required: true
    }, enabled: Boolean, purchaseEnabled: Boolean, currency: { type: String, enum: ['BDT'] }, regularPriceMinor: Number, salePriceMinor: Number, saleStartsAt: Date, saleEndsAt: Date, priceBDT: Number, salePriceBDT: Number, accessTerms: String, benefits: [String], category: String, description: String, outcomes: [String], audience: String, tools: [String], gallery: [new Schema({src:String,alt:String},nested)], instructor: {
        type: new Schema({
            name: String, biography: String
        }, nested), default: undefined
    }, thumbnail: { type: new Schema({ src: String, alt: String }, nested), default: undefined }, previewVideoUrl: String, modules: [new Schema({
            id: String, title: String, lessons: [lesson]
        }, nested)], revision: Number
}, {
    strict: true, autoIndex: false, autoCreate: false
});
learning.index({
    slug: 1
}, {
    unique: true
});
const enrollment = new Schema<Enrollment>({
    userId: {
        type: String, required: true
    }, courseSlug: {
        type: String, required: true
    }, source: {
        type: String, enum: ['free', 'scholarship', 'admin', 'payment'], required: true
    }, active: {
        type: Boolean, required: true
    }, createdAt: {
        type: Date, default: Date.now
    }
}, {
    strict: true, autoIndex: false, autoCreate: false
});
enrollment.index({
    userId: 1, courseSlug: 1
}, {
    unique: true
});
const scholarship = new Schema<Scholarship>({
    codeHash: {
        type: String, required: true, select: false
    }, generationActor:{type:String,select:false},generationKey:{type:String,select:false},generationHash:{type:String,select:false},generationNonce:{type:String,select:false},generatedAt:Date,label: String, courses: [String], anyCourse: Boolean, kind: {
        type: String, enum: ['percentage', 'fixed', 'full']
    }, amount: Number, amountMinor: Number, startsAt: Date, expiresAt: Date, totalLimit: Number, perAccountLimit: Number, minimumSpendMinor: Number, recipientEmail: String, active: Boolean, redeemed: {
        type: Number, default: 0
    }, revision: Number
}, {
    strict: true, autoIndex: false, autoCreate: false
});
scholarship.index({
    codeHash: 1
}, {
    unique: true
});
scholarship.index({generationActor:1,generationKey:1},{unique:true,partialFilterExpression:{generationKey:{$type:'string'}}});
const redemption = new Schema<Redemption>({
    codeId: String, userId: String, courseSlug: String, discountBDT: Number, discountMinor: Number, createdAt: {
        type: Date, default: Date.now
    }
}, {
    strict: true, autoIndex: false, autoCreate: false
});
redemption.index({
    codeId: 1, userId: 1, courseSlug: 1
}, {
    unique: true
});
redemption.index({
    codeId: 1, userId: 1
});
const audit = new Schema<AcademyAudit>({
    actor: String, action: String, target: String, reason: String, createdAt: {
        type: Date, default: Date.now
    }
}, {
    strict: true, autoIndex: false, autoCreate: false
});
export type OrderStatus = 'blocked' | 'pending' | 'paid' | 'free' | 'scholarship' | 'failed' | 'cancelled' | 'expired' | 'payment_review';
export interface AcademyOrderItem {courseSlug:string;courseTitle:string;subtotalMinor:number;discountMinor:number;finalMinor:number;currentPriceMinor:number;codeId?:string;reservationActive:boolean;scholarshipPercentage?:number;codeReference?:string;}
export interface AcademyCart {userId:string;courseSlugs:string[];}
export interface AcademyOrder {
    userId: string; courseSlug: string; courseTitle: string; currency: 'BDT'; checkoutMode?:'scholarship'; learnerName?:string; learnerEmail?:string; scholarshipPercentage?:number; codeReference?:string; items?:AcademyOrderItem[];
    subtotalMinor: number; discountMinor: number; finalMinor: number; currentPriceMinor?: number;
    status: OrderStatus; idempotencyKey: string; requestHash: string; codeId?: string;
    reservationActive: boolean; expiresAt: Date; createdAt: Date; providerReference?: string; checkoutUrl?: string;
}
export interface PaymentEventRecord { eventId: string; orderId: string; status: string; createdAt: Date }
const orderItem=new Schema<AcademyOrderItem>({courseSlug:String,courseTitle:String,subtotalMinor:Number,discountMinor:Number,finalMinor:Number,currentPriceMinor:Number,codeId:String,reservationActive:Boolean,scholarshipPercentage:Number,codeReference:String},nested);
const cart=new Schema<AcademyCart>({userId:{type:String,required:true},courseSlugs:[String]},{strict:true,autoIndex:false,autoCreate:false});cart.index({userId:1},{unique:true});
const order = new Schema<AcademyOrder>({ userId: {type:String,required:true}, courseSlug:{type:String,required:true}, courseTitle:String,
    items:{type:[orderItem],default:undefined},currency:{type:String,enum:['BDT'],required:true}, subtotalMinor:Number,discountMinor:Number,finalMinor:Number,currentPriceMinor:Number,
    status:{type:String,enum:['blocked','pending','paid','free','scholarship','failed','cancelled','expired','payment_review'],required:true},
    idempotencyKey:String,requestHash:{type:String,select:false},codeId:String,reservationActive:Boolean,expiresAt:Date,
    createdAt:{type:Date,default:Date.now},providerReference:String,checkoutUrl:String,checkoutMode:{type:String,enum:['scholarship']},learnerName:String,learnerEmail:String,scholarshipPercentage:Number,codeReference:String
}, {strict:true,autoIndex:false,autoCreate:false});
order.index({userId:1,idempotencyKey:1},{unique:true});
order.index({providerReference:1},{unique:true,sparse:true});
order.index({codeId:1,reservationActive:1,expiresAt:1});
order.index({userId:1,createdAt:-1});
order.index({'items.codeId':1,status:1,expiresAt:1});
const paymentEvent = new Schema<PaymentEventRecord>({eventId:{type:String,required:true},orderId:String,status:String,createdAt:{type:Date,default:Date.now}}, {strict:true,autoIndex:false,autoCreate:false});
paymentEvent.index({eventId:1},{unique:true});
export const academyDefinitions = [{name:'AcademyCart',collection:'academy_carts',schema:cart},{ name: 'AcademyOrder', collection: 'academy_orders', schema: order }, { name: 'AcademyPaymentEvent', collection: 'academy_payment_events', schema: paymentEvent }, {
        name: 'LearningCourse', collection: 'academy_learning_courses', schema: learning
    }, {
        name: 'AcademyEnrollment', collection: 'academy_enrollments', schema: enrollment
    }, {
        name: 'AcademyScholarship', collection: 'academy_scholarships', schema: scholarship
    }, {
        name: 'AcademyRedemption', collection: 'academy_redemptions', schema: redemption
    }, {
        name: 'AcademyAudit', collection: 'academy_audits', schema: audit
    }];
