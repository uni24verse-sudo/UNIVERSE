import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './HeroCarousel.css';

const HeroCarousel = ({ onSearch }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mock advertising data (this could come from DB in future)
  const slides = [
    {
      id: 1,
      title: '50% Off Gourmet Burgers',
      subtitle: 'Satisfy your late-night cravings instantly.',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Flash Sale'
    },
    {
      id: 2,
      title: 'The Tandoori Hub Special',
      subtitle: 'Authentic flavors, delivered steaming hot.',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'Featured Stall'
    },
    {
      id: 3,
      title: 'Craving Sweet?',
      subtitle: 'Fresh baked desserts right to your dorm.',
      image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80',
      color: 'var(--primary)',
      tag: 'New Arrivals'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="hero-carousel-container animate-fade-in-up">
      <div className="hero-carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
        {slides.map((slide, index) => (
          <div key={slide.id} className="hero-slide" style={{ backgroundImage: `url(${slide.image})` }}>
            <div className="hero-slide-overlay" style={{ background: `linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 50%, transparent 100%)` }}></div>
            
            <div className="hero-slide-content">
              <span className="hero-slide-tag" style={{ backgroundColor: slide.color }}>
                {slide.tag}
              </span>
              <h1 className="hero-slide-title">{slide.title}</h1>
              <p className="hero-slide-subtitle">{slide.subtitle}</p>
              <button className="hero-slide-cta" style={{ backgroundColor: slide.color }}>
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Controls */}
      <div className="hero-carousel-controls">
        {slides.map((_, idx) => (
          <button 
            key={idx} 
            className={`hero-carousel-dot ${currentSlide === idx ? 'active' : ''}`}
            onClick={() => setCurrentSlide(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
