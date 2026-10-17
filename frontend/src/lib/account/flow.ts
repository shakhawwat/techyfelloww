/** Only known local Academy and account destinations may be used after authentication. */
export function accountReturnTo(value:unknown,fallback='/academy'):string {
 if(typeof value!=='string'||value.length>(value.startsWith('/blog')?2400:300))return fallback;
 if(value.startsWith('/blog')&&!/[\\\x00-\x1f]/.test(value)){try{const url=new URL(value,'https://techyfellow.invalid');if(url.origin==='https://techyfellow.invalid'&&url.pathname===value.split(/[?#]/)[0]&&/^\/blog(?:\/[a-z0-9]+(?:-[a-z0-9]+)*|\/(?:messages|support)\/[a-f0-9]{24}|\/authors\/[a-f0-9]{24})?$/.test(url.pathname)&&[...url.searchParams.keys()].every(key=>['search','category','page','author','post','view','action','value','user'].includes(key))&&(!url.hash||/^#comment-[a-f0-9]{24}$/.test(url.hash)))return url.pathname+url.search+url.hash;}catch{}}
 if(value.startsWith('/store')&&!/[\\\x00-\x1f]/.test(value)){try{const url=new URL(value,'https://techyfellow.invalid');if(url.origin==='https://techyfellow.invalid'&&/^\/store(?:\/(?:products|kits|cart|wishlist|checkout|orders)|\/products\/[a-z0-9]+(?:-[a-z0-9]+)*|\/orders\/[a-f0-9]{24})?$/.test(url.pathname)&&[...url.searchParams.keys()].every(key=>['search','category','min','max','availability','sort','page'].includes(key))&&!url.hash)return url.pathname+url.search;}catch{}}
 return value==='/blog'||value==='/account/profile'||value==='/account/blog'||value==='/account/blog/new'||/^\/account\/blog\/[a-f0-9]{24}$/.test(value)||value==='/account/inbox'||value==='/account/messages'||/^\/account\/inbox\/[a-f0-9]{24}$/.test(value)||value==='/academy'||value==='/academy/cart'||value==='/academy/my-learning'||value==='/academy/wishlist'||/^\/academy\/courses\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/order)?$/.test(value)||/^\/academy\/orders\/[a-f0-9]{24}\/memo$/.test(value)?value:fallback;
}
export function accountFormValues(form:FormData,signup:boolean){
 const email=String(form.get('email')??'').trim().toLowerCase(),password=String(form.get('password')??''),name=String(form.get('name')??'').trim(),passwordConfirmation=String(form.get('passwordConfirmation')??'');
 if(signup&&(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name)))throw new Error('Enter your name (1–120 characters).');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
 if(!password||password.length>128)throw new Error('Enter your password (up to 128 characters).');
 if(signup&&(password.length<6||!/\p{L}/u.test(password)||!/\p{Nd}/u.test(password)))throw new Error('Use at least 6 characters, including a letter and a number.');
 if(signup&&password!==passwordConfirmation)throw new Error('Confirm password must match your password.');
 return signup?{name,email,password,passwordConfirmation}:{email,password};
}
