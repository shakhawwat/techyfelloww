import {Schema} from 'mongoose';
export interface StoreCategory {slug:string;name:string;parent?:string;active:boolean;revision:number;order:number}
export interface StoreBasket {owner:string;revision:number;items:{productId:string;quantity:number}[];wishlist:string[]}
export const requestStatuses=['submitted','reviewing','confirmed','declined','cancelled'] as const;
export type RequestStatus=typeof requestStatuses[number];
export interface StoreOrder {owner:string;key:string;requestHash:string;reference:string;customer:{name:string;phone:string;email:string;address:string;city:string;postalCode?:string;notes?:string};items:{productId:string;slug:string;sku:string;title:string;quantity:number;unitPriceMinor:number;lineTotalMinor:number}[];subtotalMinor:number;currency:'BDT';status:RequestStatus;revision:number;history:{status:RequestStatus;actor:string;at:Date}[];createdAt:Date}
const options={timestamps:true,strict:true,autoIndex:false,autoCreate:false} as const;
const nested={_id:false,strict:true} as const;
const category=new Schema<StoreCategory>({slug:{type:String,required:true,match:/^[a-z0-9]+(?:-[a-z0-9]+)*$/,maxlength:160},name:{type:String,required:true,maxlength:100},parent:{type:String,maxlength:160},active:{type:Boolean,default:false},revision:{type:Number,required:true,default:1},order:{type:Number,default:0}},options);
category.index({slug:1},{unique:true});
const basket=new Schema<StoreBasket>({owner:{type:String,required:true},revision:{type:Number,required:true,default:1},items:{type:[new Schema({productId:{type:String,required:true},quantity:{type:Number,required:true,min:1,max:99,validate:Number.isSafeInteger}},nested)],default:[]},wishlist:{type:[String],default:[]}},options);
basket.index({owner:1},{unique:true});
const order=new Schema<StoreOrder>({owner:{type:String,required:true},key:{type:String,required:true},requestHash:{type:String,required:true},reference:{type:String,required:true},customer:{type:new Schema({name:String,phone:String,email:String,address:String,city:String,postalCode:String,notes:String},nested),required:true},items:{type:[new Schema({productId:String,slug:String,sku:String,title:String,quantity:Number,unitPriceMinor:Number,lineTotalMinor:Number},nested)],required:true},subtotalMinor:{type:Number,required:true},currency:{type:String,enum:['BDT'],required:true},status:{type:String,enum:requestStatuses,default:'submitted'},revision:{type:Number,default:1},history:{type:[new Schema({status:{type:String,enum:requestStatuses},actor:String,at:Date},nested)],default:[]}},options);
order.index({owner:1,key:1},{unique:true});order.index({reference:1},{unique:true});order.index({owner:1,createdAt:-1});order.index({status:1,createdAt:-1});
export const storeDefinitions=[{name:'StoreCategory',collection:'store_categories',schema:category},{name:'StoreBasket',collection:'store_baskets',schema:basket},{name:'StoreOrder',collection:'store_orders',schema:order}];
