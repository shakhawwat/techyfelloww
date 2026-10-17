'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import type { EditorialPage } from '@/lib/public/editorial';
import styles from './store.module.css';

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export type StoreHeroSlide = {
  key: string;
  eyebrow: string;
  headline: string;
  description: string;
  primaryButton: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  image: string;
  mobileImage?: string;
  alt: string;
};

export const DEFAULT_STORE_SLIDES: StoreHeroSlide[] = [
  {
    key: 'hero-1',
    eyebrow: 'TECHYFELLOW ROBOTICS STORE',
    headline: 'Parts for your next breakthrough.',
    description:
      'Explore robotics kits, boards and electronics. Find the parts, review the specifications and send your order request.',
    primaryButton: { label: 'Explore the Catalog', href: '/store/products' },
    secondaryButton: { label: 'Robotics Kits', href: '/store/kits' },
    image: '/banner/b1.jpg',
    mobileImage: '/banner/b1.jpg',
    alt: 'High-performance robotics and computing hardware',
  },
  {
    key: 'hero-2',
    eyebrow: 'DEVELOPMENT BOARDS',
    headline: 'Build smarter. Create faster.',
    description:
      'Explore microcontrollers, development boards and electronics for robotics, IoT and embedded systems.',
    primaryButton: { label: 'Explore Boards', href: '/store/products?category=development-boards' },
    secondaryButton: { label: 'All Products', href: '/store/products' },
    image: '/banner/esp32Bannetr.jpg',
    mobileImage: '/banner/esp32Bannetr.jpg',
    alt: 'Microcontrollers, IoT and embedded systems boards',
  },
  {
    key: 'hero-3',
    eyebrow: 'ROBOTICS & INNOVATION',
    headline: 'Build the future, one component at a time.',
    description:
      'Discover robotics kits, sensors, motors and essential components for your next engineering project.',
    primaryButton: { label: 'Shop Robotics', href: '/store/products?category=robotics-kits' },
    secondaryButton: { label: 'Explore the Catalog', href: '/store/products' },
    image: '/banner/iot_banner.jpg',
    mobileImage: '/banner/iot_banner.jpg',
    alt: 'Robotics kits, sensors, motors and engineering components',
  },
];

export function buildSlides(banner?: EditorialPage | null): StoreHeroSlide[] {
  const sections = banner?.sections?.filter(
    section => section.visible !== false && (section.title || section.description || section.image)
  );

  if (!sections || sections.length === 0) {
    return DEFAULT_STORE_SLIDES;
  }

  const mapped: StoreHeroSlide[] = sections.map((section, idx) => {
    const fallback = DEFAULT_STORE_SLIDES[idx] ?? DEFAULT_STORE_SLIDES[0];
    const primaryHref = section.href || fallback.primaryButton.href;
    let secondary = fallback.secondaryButton;

    if (primaryHref === '/store/kits' || primaryHref === '/store/products?category=robotics-kits') {
      secondary = { label: 'Explore the Catalog', href: '/store/products' };
    } else if (primaryHref === '/store/products') {
      secondary = { label: 'Robotics Kits', href: '/store/kits' };
    } else if (primaryHref.includes('category=development-boards')) {
      secondary = { label: 'All Products', href: '/store/products' };
    }

    return {
      key: section.key || `slide-${idx + 1}`,
      eyebrow: section.label || fallback.eyebrow,
      headline: section.title || fallback.headline,
      description: section.description || fallback.description,
      primaryButton: {
        label: section.cta || fallback.primaryButton.label,
        href: primaryHref,
      },
      secondaryButton: secondary,
      image: section.image || fallback.image,
      mobileImage: section.mobileImage || section.image || fallback.mobileImage,
      alt: section.alt || section.title || fallback.alt,
    };
  });

  if (mapped.length === 1) {
    return [mapped[0], ...DEFAULT_STORE_SLIDES.slice(1)];
  }

  return mapped;
}

export function StoreHeroSlider({ banner }: { banner?: EditorialPage | null }) {
  const slides = buildSlides(banner);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [navHeight, setNavHeight] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Dynamically calculate sticky Store navbar height to size slider to remaining viewport
  useEffect(() => {
    function measureNav() {
      const nav = document.querySelector('header[data-store-navbar]');
      if (nav) {
        const height = Math.round(nav.getBoundingClientRect().height);
        if (height > 0) {
          setNavHeight(height);
          document.documentElement.style.setProperty('--store-navbar-height', `${height}px`);
        }
      }
    }
    measureNav();
    window.addEventListener('resize', measureNav);
    return () => window.removeEventListener('resize', measureNav);
  }, []);

  // Autoplay transitions every 5.5s, pausing on hover/focus and respecting prefers-reduced-motion
  useEffect(() => {
    if (slides.length <= 1 || isPaused || prefersReducedMotion) return;
    const timer = setInterval(nextSlide, 5500);
    return () => clearInterval(timer);
  }, [slides.length, isPaused, prefersReducedMotion, nextSlide, currentIndex]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextSlide();
      else prevSlide();
    }
    touchStartRef.current = null;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  }

  return (
    <section
      className={styles.sliderContainer}
      style={{
        ['--store-navbar-height' as string]: navHeight ? `${navHeight}px` : undefined,
        ['--actual-nav-height' as string]: navHeight ? `${navHeight}px` : undefined,
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Store promotional hero slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsPaused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      <div
        className={styles.sliderTrack}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: prefersReducedMotion ? 'none' : 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        aria-live={isPaused ? 'polite' : 'off'}
      >
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <article
              key={slide.key}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}: ${slide.headline}`}
              aria-hidden={!isActive}
            >
              {/* Full bleed background imagery layer with dark gradient overlay */}
              <div className={styles.slideBackground}>
                <picture>
                  {slide.mobileImage && (
                    <source media="(max-width: 700px)" srcSet={slide.mobileImage} />
                  )}
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className={styles.slideBackgroundImage}
                    loading="eager"
                  />
                </picture>
                <div className={styles.slideOverlay} aria-hidden="true" />
              </div>

              {/* Content layer positioned on top of the background */}
              <div className={styles.slideInner}>
                <div className={styles.slideContent}>
                  <p className={styles.slideEyebrow}>
                    <span className={styles.slideEyebrowPulse} aria-hidden="true" />
                    {slide.eyebrow}
                  </p>
                  <h1 className={styles.slideTitle}>{slide.headline}</h1>
                  <p className={styles.slideDescription}>{slide.description}</p>
                  <div className={styles.slideButtons}>
                    <Link
                      className={styles.primary}
                      href={slide.primaryButton.href}
                      tabIndex={isActive ? 0 : -1}
                    >
                      <span>{slide.primaryButton.label}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    {slide.secondaryButton && (
                      <Link
                        className={styles.secondaryBtn}
                        href={slide.secondaryButton.href}
                        tabIndex={isActive ? 0 : -1}
                      >
                        <Package size={15} aria-hidden="true" />
                        <span>{slide.secondaryButton.label}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.sliderArrow} ${styles.sliderArrowPrev}`}
            aria-label="Previous slide"
            onClick={prevSlide}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.sliderArrow} ${styles.sliderArrowNext}`}
            aria-label="Next slide"
            onClick={nextSlide}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>

          <div className={styles.sliderDots} role="tablist" aria-label="Slide selector">
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                className={styles.sliderDot}
                role="tab"
                aria-selected={currentIndex === index}
                aria-label={`Go to slide ${index + 1}: ${slide.headline}`}
                aria-current={currentIndex === index ? 'true' : undefined}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>

          <div className={styles.sliderProgressBar} aria-hidden="true">
            <div
              key={`progress-${currentIndex}-${isPaused}-${prefersReducedMotion}`}
              className={styles.sliderProgressFill}
              style={{
                animationPlayState: isPaused || prefersReducedMotion ? 'paused' : 'running',
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
