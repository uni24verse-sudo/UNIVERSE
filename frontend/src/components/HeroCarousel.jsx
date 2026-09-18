import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, ArrowRight } from 'lucide-react';
import './HeroCarousel.css';

const HeroCarousel = ({ onSearch, hubType = 'College' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paidBanners, setPaidBanners] = useState([]);
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
          const formatted = res.data.map(b => ({
            id: b.id,
            title: b.title || `${b.storeName} Specials`,
            subtitle: `Exclusive offers from ${b.storeName}. Skip the wait and order fresh!`,
            image: b.bannerUrl || b.rawAssetUrl,
            color: 'var(--primary)',
            tag: b.tag || 'Featured Stall',
            stallId: b.stallId,
            targetUrl: b.targetUrl || `/store/${b.stallId}`
          }));
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

  // Auto-advance timer (5 seconds)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSlideClick = (slide) => {
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

  return (
    <div className="hero-carousel-container animate-fade-in-up">
      <div className="hero-carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            className="hero-slide" 
            style={{ 
              backgroundImage: `url(${slide.image})`,
              cursor: slide.stallId ? 'pointer' : 'default'
            }}
            onClick={() => handleSlideClick(slide)}
          >
            <div className="hero-slide-overlay" style={{ background: `linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 50%, transparent 100%)` }}></div>
            
            <div className="hero-slide-content">
              <span className="hero-slide-tag" style={{ backgroundColor: slide.color }}>
                {slide.tag}
              </span>
              <h1 className="hero-slide-title">{slide.title}</h1>
              <p className="hero-slide-subtitle">{slide.subtitle}</p>
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
          </div>
        ))}
      </div>

      {/* Carousel Controls */}
      {slides.length > 1 && (
        <div className="hero-carousel-controls">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              className={`hero-carousel-dot ${currentSlide === idx ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(idx);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
