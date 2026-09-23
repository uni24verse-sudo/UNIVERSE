import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import './HeroCarousel.css';

const HeroCarousel = ({ onSearch, hubType = 'College' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paidBanners, setPaidBanners] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionLockedRef = useRef(null); // 'horizontal' | 'vertical' | null
  const hasMovedRef = useRef(false);
  const autoPlayTimerRef = useRef(null);
  const navigate = useNavigate();

  const collegeSlides = [
    {
      id: 'default-1',
      title: 'Your Campus, Digitized',
      subtitle: 'Experience seamless food ordering right across the campus.',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Welcome to UniVerse'
    },
    {
      id: 'default-2',
      title: 'Skip the Line',
      subtitle: 'Order ahead and pick up your food fresh and hot.',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Save Time'
    },
    {
      id: 'default-3',
      title: 'Craving Something Sweet?',
      subtitle: 'Pre-order your favorite desserts and pick them up hot and fresh.',
      image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Fresh & Tasty'
    }
  ];

  const citySlides = [
    {
      id: 'default-1',
      title: "Your City's Best Bites",
      subtitle: 'Discover top-rated street food and local stalls around you.',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Explore Local'
    },
    {
      id: 'default-2',
      title: 'Fresh & Hot',
      subtitle: 'From wok to box, order the freshest meals in your area.',
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Authentic Taste'
    },
    {
      id: 'default-3',
      title: 'Late Night Cravings?',
      subtitle: 'Find places that serve hot food exactly when you need it.',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Night Owls'
    }
  ];

  // Fetch active paid banners for current user's campus or city hub
  useEffect(() => {
    const fetchActiveBanners = async () => {
      try {
        const locationName = localStorage.getItem('universe_location_name') || '';
        const locationId = localStorage.getItem('universe_location_id') || '';
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const res = await axios.get(`${API_URL}/api/banners/active`, {
          params: { hub: locationName, locationId }
        });

        if (Array.isArray(res.data) && res.data.length > 0) {
          const formatted = res.data.map(b => {
            const hasOverlay = Boolean(b.title && b.title.trim() !== '' && b.title !== '__NO_TEXT__');
            return {
              id: b.id,
              title: hasOverlay ? b.title : '',
              hasTextOverlay: hasOverlay,
              subtitle: hasOverlay ? (b.subtitle || `Exclusive offers from ${b.storeName}. Skip the wait and order fresh!`) : '',
              image: b.bannerUrl || b.rawAssetUrl,
              color: 'var(--primary)',
              tag: hasOverlay ? (b.tag || '') : '',
              stallId: b.stallId,
              targetUrl: b.targetUrl || `/store/${b.stallId}`
            };
          });
          setPaidBanners(formatted);
        } else {
          setPaidBanners([]);
        }
      } catch (err) {
        console.warn('Could not load location hero banners, falling back to defaults:', err.message);
      }
    };

    fetchActiveBanners();
  }, [hubType]);

  // Combine paid banners with fallback defaults if fewer than 3
  const defaultSlides = hubType === 'College' ? collegeSlides : citySlides;
  const slides = paidBanners.length > 0 ? paidBanners : defaultSlides;

  // Reset slide index if slides array changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  // Navigation handlers
  const goToNextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  // Smart Autoplay Timer - pauses during drag, hover, or right after manual interactions
  const resetAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (slides.length > 1 && !isHovered && !isDragging) {
      autoPlayTimerRef.current = setInterval(() => {
        goToNextSlide();
      }, 5000);
    }
  }, [slides.length, isHovered, isDragging, goToNextSlide]);

  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [resetAutoPlay]);

  // Manual Touch Swipe Handlers (iOS / Android fluid gesture)
  const handleTouchStart = (e) => {
    if (slides.length <= 1) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    directionLockedRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!startXRef.current || slides.length <= 1) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // Detect user intention (horizontal swipe vs vertical page scroll)
    if (directionLockedRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        if (Math.abs(diffX) >= Math.abs(diffY)) {
          directionLockedRef.current = 'horizontal';
        } else {
          directionLockedRef.current = 'vertical';
        }
      }
    }

    if (directionLockedRef.current === 'horizontal') {
      // Prevent browser horizontal rubber-banding while swiping carousel
      if (e.cancelable) {
        e.preventDefault();
      }
      hasMovedRef.current = true;
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (directionLockedRef.current === 'horizontal' && slides.length > 1) {
      const containerWidth = containerRef.current?.clientWidth || 360;
      const swipeThreshold = Math.min(60, containerWidth * 0.15);

      if (dragOffset < -swipeThreshold) {
        goToNextSlide();
      } else if (dragOffset > swipeThreshold) {
        goToPrevSlide();
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    startXRef.current = 0;
    startYRef.current = 0;
    directionLockedRef.current = null;
    resetAutoPlay();

    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  };

  // Manual Mouse Drag Handlers (Desktop fluid drag)
  const handleMouseDown = (e) => {
    if (e.button !== 0 || slides.length <= 1) return; // Only primary button
    startXRef.current = e.clientX;
    hasMovedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || slides.length <= 1) return;
    const diffX = e.clientX - startXRef.current;
    if (Math.abs(diffX) > 5) {
      hasMovedRef.current = true;
    }
    setDragOffset(diffX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    if (slides.length > 1) {
      const containerWidth = containerRef.current?.clientWidth || 500;
      const swipeThreshold = Math.min(70, containerWidth * 0.15);

      if (dragOffset < -swipeThreshold) {
        goToNextSlide();
      } else if (dragOffset > swipeThreshold) {
        goToPrevSlide();
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    startXRef.current = 0;
    resetAutoPlay();

    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isDragging) {
      handleMouseUp();
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleSlideClick = (slide) => {
    // If the user was dragging or swiping, prevent accidental click navigation
    if (hasMovedRef.current) return;

    if (slide.stallId) {
      navigate(`/store/${slide.stallId}`);
    } else if (slide.targetUrl) {
      navigate(slide.targetUrl);
    } else if (onSearch) {
      onSearch('');
    } else {
      window.scrollTo({ top: 550, behavior: 'smooth' });
    }
  };

  // Dynamic live translate with 1:1 finger/cursor tracking
  const containerWidth = containerRef.current?.clientWidth || 1;
  const dragPercent = containerWidth > 0 ? (dragOffset / containerWidth) * 100 : 0;
  const currentTranslate = -(currentSlide * 100) + dragPercent;

  return (
    <div 
      ref={containerRef}
      className={`hero-carousel-container animate-fade-in-up ${isDragging ? 'is-dragging' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        className="hero-carousel-track" 
        style={{ 
          transform: `translateX(${currentTranslate}%)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {slides.map((slide, index) => (
          <div 
            key={slide.id || index} 
            className="hero-slide" 
            style={{ 
              backgroundImage: `url(${slide.image})`,
              cursor: isDragging ? 'grabbing' : (slide.stallId ? 'pointer' : 'grab')
            }}
            onClick={() => handleSlideClick(slide)}
          >
            {slide.hasTextOverlay !== false && slide.title ? (
              <>
                <div className="hero-slide-overlay"></div>
                
                <div className="hero-slide-content">
                  {slide.tag && (
                    <span className="hero-slide-tag" style={{ backgroundColor: slide.color }}>
                      {slide.tag}
                    </span>
                  )}
                  <h1 className="hero-slide-title">{slide.title}</h1>
                  {slide.subtitle && <p className="hero-slide-subtitle">{slide.subtitle}</p>}
                  <button 
                    className="hero-slide-cta" 
                    style={{ backgroundColor: slide.color, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSlideClick(slide);
                    }}
                  >
                    {slide.stallId ? 'Order from Stall' : 'Explore Now'} <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>

      {/* Manual Desktop Nav Arrows */}
      {slides.length > 1 && (
        <>
          <button 
            type="button"
            className="hero-nav-arrow hero-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevSlide();
              resetAutoPlay();
            }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={22} />
          </button>
          <button 
            type="button"
            className="hero-nav-arrow hero-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              goToNextSlide();
              resetAutoPlay();
            }}
            aria-label="Next slide"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Carousel Dots */}
      {slides.length > 1 && (
        <div className="hero-carousel-controls">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              type="button"
              className={`hero-carousel-dot ${currentSlide === idx ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(idx);
                resetAutoPlay();
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
