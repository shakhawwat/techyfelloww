'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {Heart,ImageIcon,ShoppingCart,X,ZoomIn} from 'lucide-react';
import {useStore} from './provider';
import {money,productHref,type StoreProduct} from './types';
import styles from './store.module.css';

export {ProductSkeleton,ProductGridSkeleton} from './skeleton';

export function ProductActions({product,full=false}:{product:StoreProduct;full?:boolean}){
  const {state,add,save,busy,loading}=useStore(),[quantity,setQuantity]=useState(1),[added,setAdded]=useState(false);
  const saved=state?.wishlist.some(item=>item.productId===product.id)??false;
  return (
    <div className={styles.productActions}>
      {full&&<label className={styles.quantity}>Quantity<input type="number" aria-label="Product quantity" min={1} max={Math.min(99,product.stockQuantity??1)} step={1} value={quantity} disabled={!product.available||busy} onChange={event=>{setAdded(false);setQuantity(Number(event.target.value));}}/></label>}
      <button type="button" className={styles.primary} disabled={!product.available||busy||loading||!Number.isInteger(quantity)||quantity<1||quantity>Math.min(99,product.stockQuantity??1)} aria-label={`Add to cart: ${product.title}`} onClick={()=>void add(product.id,quantity).then(ok=>setAdded(ok))}>
        <ShoppingCart size={16}/>{added?'Added to cart':'Add to cart'}
      </button>
      <button type="button" className={styles.wish} aria-label={`${saved?'Remove from':'Add to'} wishlist: ${product.title}`} aria-pressed={saved} disabled={busy||loading} onClick={()=>void save(product.id,!saved)}>
        <Heart size={18} fill={saved?'currentColor':'none'}/>
      </button>
      {added&&full&&<Link href="/store/cart">View cart</Link>}
    </div>
  );
}

export function ProductCard({product}:{product:StoreProduct}){
  const image=product.media.find(media=>media.type==='image'&&media.url),
    discount=!product.illustrative&&product.priceMinor!==undefined&&product.compareAtMinor!==undefined&&product.compareAtMinor>product.priceMinor;
  return (
    <article className={styles.product} data-product={product.slug}>
      <Link className={styles.productImage} href={productHref(product)} aria-label={`View ${product.title}`}>
        {image?.url?<Image src={image.url} alt={image.altText} width={image.width??400} height={image.height??300} unoptimized/>:<span className={styles.noImage}><ImageIcon size={32}/>Image not supplied</span>}
        {product.illustrative?<span className={styles.tag}>Illustrative · Not for sale</span>:discount?<span className={styles.tag}>Save {money(product.compareAtMinor!-product.priceMinor!)}</span>:null}
      </Link>
      <div className={styles.productContent}>
        <small>{product.sku??'Robotics & electronics'}</small>
        <h3><Link href={productHref(product)}>{product.title}</Link></h3>
        <p className={styles.price}>{money(product.priceMinor)}{discount&&<del>{money(product.compareAtMinor)}</del>}</p>
        <p className={product.available?styles.stock:styles.unavailable}>
          <span className={styles.stockDot} aria-hidden="true"/>
          {product.illustrative?'Illustrative product':product.available?'In stock':product.stockQuantity===0?'Out of stock':'Unavailable for ordering'}
        </p>
        <ProductActions product={product}/>
      </div>
    </article>
  );
}

export function ProductGrid({products}:{products:StoreProduct[]}){
  return (
    <div className={styles.grid}>
      {products.map(product=><ProductCard key={product.id} product={product}/>)}
    </div>
  );
}

export function ProductGallery({product}:{product:StoreProduct}){
  const images=product.media.filter(media=>media.type==='image'&&media.url),[index,setIndex]=useState(0),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),image=images[index];
  return (
    <div className={styles.gallery}>
      {image?.url?<>
        <button ref={trigger} type="button" className={styles.galleryMain} aria-label="Enlarge product image" aria-haspopup="dialog" onClick={()=>{dialog.current?.showModal();dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();}}>
          <Image src={image.url} alt={image.altText} width={image.width??800} height={image.height??600} unoptimized/>
          <span><ZoomIn size={16}/>Enlarge image</span>
        </button>
        <div className={styles.thumbnails} aria-label="Product images">
          {images.map((image,i)=><button type="button" key={i} aria-label={`View product image ${i+1}`} aria-pressed={i===index} onClick={()=>setIndex(i)}><Image src={image.url!} alt={image.altText} width={72} height={72} unoptimized/></button>)}
        </div>
        <dialog ref={dialog} className={styles.imageDialog} aria-label="Enlarged product image" onClose={()=>trigger.current?.focus()} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
          <button type="button" aria-label="Close enlarged image" onClick={()=>dialog.current?.close()}><X/></button>
          <Image src={image.url} alt={image.altText} width={image.width??1200} height={image.height??900} unoptimized/>
        </dialog>
      </>:<div className={styles.galleryMain}><span className={styles.noImage}><ImageIcon size={48}/>Product image not supplied</span></div>}
    </div>
  );
}
