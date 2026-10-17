import styles from './store.module.css';

export function ProductSkeleton() {
  return (
    <article className={`${styles.product} ${styles.skeletonCard}`} aria-hidden="true">
      <div className={`${styles.productImage} ${styles.skeletonImage}`}>
        <div className={styles.shimmer} />
      </div>
      <div className={styles.productContent}>
        <div className={`${styles.skeletonLine} ${styles.skeletonSku}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonTitleShort}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonPrice}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonStock}`} />
        <div className={styles.skeletonActions}>
          <div className={`${styles.skeletonLine} ${styles.skeletonBtnPrimary}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonBtnWish}`} />
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({count = 4}: {count?: number}) {
  return (
    <div className={styles.grid} aria-label="Loading products" role="status">
      {Array.from({length: count}).map((_, index) => (
        <ProductSkeleton key={index} />
      ))}
    </div>
  );
}
