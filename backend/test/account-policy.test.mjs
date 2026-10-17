import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url);
const {parseRegistration,accountDto}=require('../dist/account/account.service.js');
const {grantedPermissions,permissions}=require('../dist/auth/permissions.js');
const {verificationConfiguration,encryptVerificationToken,decryptVerificationToken}=require('../dist/account/verification-config.js');
const {validateEnvironment}=require('../dist/config/environment.js');
const good={name:' Synthetic Member ',email:' MEMBER@EXAMPLE.INVALID ',password:'a1'+randomBytes(24).toString('hex')};good.passwordConfirmation=good.password;
test('public registration validates exact safe fields and MEMBER has zero grants',()=>{
 const parsed=parseRegistration(good);assert.equal(parsed.name,'Synthetic Member');assert.equal(parsed.email,'member@example.invalid');
 for(const privileged of ['role','permissions','enabled','emailVerifiedAt','marketingConsent','passwordHash','_id'])assert.throws(()=>parseRegistration({...good,[privileged]:true}),e=>e.getStatus()===400);
 for(const bad of [null,[],{...good,passwordConfirmation:'different'},{...good,name:''},{...good,name:'x'.repeat(121)},{...good,email:'invalid'},{...good,password:'short',passwordConfirmation:'short'}])assert.throws(()=>parseRegistration(bad),e=>e.getStatus()===400);
 assert.deepEqual(grantedPermissions('MEMBER'),[]);assert.ok(permissions.length>0);
 assert.deepEqual(Object.keys(accountDto({_id:'synthetic',...good,role:'MEMBER',passwordHash:'PRIVATE',enabled:true})).sort(),['email','emailVerified','id','name','role']);
});
test('verification configuration fails closed and encrypted tokens authenticate ciphertext',()=>{
 const key=randomBytes(32).toString('hex'),token=randomBytes(32).toString('base64url'),payload=encryptVerificationToken(token,key);
 assert.ok(!payload.includes(token));assert.equal(decryptVerificationToken(payload,key),token);assert.throws(()=>decryptVerificationToken(payload,randomBytes(32).toString('hex')));
 assert.equal(verificationConfiguration({}).canQueue,false);assert.equal(verificationConfiguration({ACCOUNT_VERIFICATION_KEY:key,EMAIL_FROM:'synthetic@example.invalid',EMAIL_ENABLED:'false'}).canDeliver,false);
 assert.equal(verificationConfiguration({ACCOUNT_VERIFICATION_KEY:key,EMAIL_FROM:'synthetic@example.invalid',EMAIL_ENABLED:'false'}).canQueue,true);
 assert.throws(()=>validateEnvironment({MONGODB_URI:'mongodb://mongodb:27017/synthetic',ACCOUNT_VERIFICATION_KEY:'invalid'}));
});

test('member passwords require 6 characters, a letter and number; staff policy stays 12 characters',()=>{const {validMemberPassword,validBootstrapPassword}=require('../dist/auth/password.js');for(const value of ['abc123','বাংলা১২৩','ExistingLong1'])assert(validMemberPassword(value));for(const value of ['a1234','abcdef','123456','x'.repeat(129),null])assert(!validMemberPassword(value));assert(!validBootstrapPassword('abc123'));assert(validBootstrapPassword('abcdefghijkl'));assert.equal(parseRegistration({...good,password:'abc123',passwordConfirmation:'abc123'}).password,'abc123');for(const value of ['abcdef','123456'])assert.throws(()=>parseRegistration({...good,password:value,passwordConfirmation:value}),error=>error.getStatus()===400);});
