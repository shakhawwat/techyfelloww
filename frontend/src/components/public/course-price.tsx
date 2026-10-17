import {AcademyPrice} from '@/components/academy/academy-price';
import {coursePrice,type CoursePreview} from './academy-data';
import styles from './academy-carousel.module.css';
export function CoursePrice({entry}:{entry:CoursePreview}){
 if(!entry.demo)return <div className={styles.price}><AcademyPrice courseId={entry.slug} showAccess={false}/></div>;
 const pricing=coursePrice(entry);if(!pricing)return null;
 const format=(value:number)=>`৳${value.toLocaleString('en-US')}`;
 return <div className={styles.price}>{pricing.original!==undefined&&<del>{format(pricing.original)}</del>}<strong>{format(pricing.price)}</strong>{pricing.discount!==undefined&&<span>{pricing.discount}% {entry.demo?'example discount':'off'}</span>}</div>;
}
