'use client';
import Image from 'next/image';
import {useState} from 'react';
import {Play} from 'lucide-react';
import {coursePhotos,courseVideo,type CoursePreview} from './academy-data';
import styles from './course-details.module.css';
export function CourseGallery({entry}:{entry:CoursePreview}){
 const photos=coursePhotos(entry),video=courseVideo(entry),[selection,setSelection]=useState(photos.length?0:-1),photo=photos[selection],playing=selection===photos.length&&!!video;
 if(!photos.length&&!video)return null;
 return <section className={styles.gallery} aria-label={`${entry.title} media gallery`}>
  <div className={styles.mainMedia}>{playing?<iframe key={entry.slug} src={`${video.embedUrl}${video.embedUrl.includes('?')?'&':'?'}autoplay=1&playsinline=1`} title={`${entry.title} — ${video.title}`} allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:photo?<Image src={photo.url} alt={photo.altText} width={photo.width} height={photo.height} unoptimized/>:<p>Select the video thumbnail to load the player.</p>}</div>
  <div className={styles.mediaThumbnails}>{photos.map((image,index)=><button key={image.url} type="button" aria-label={`Show photo ${index+1}: ${image.altText}`} aria-pressed={!playing&&selection===index} onClick={()=>setSelection(index)}><Image src={image.url} alt="" width={image.width} height={image.height} unoptimized/></button>)}{video&&<button type="button" aria-label={`Play ${video.title}`} aria-pressed={playing} onClick={()=>setSelection(photos.length)}><Play aria-hidden="true"/><span>{video.title}</span></button>}</div>
  {entry.demo&&<p className={styles.note}>Images are illustrative. The shared learning video is an external resource, not a Techy Fellow course lesson.</p>}
 </section>;
}
