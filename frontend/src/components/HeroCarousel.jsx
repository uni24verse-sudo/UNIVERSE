import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './HeroCarousel.css';

const HeroCarousel = ({ onSearch }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock advertising data (this could come from DB in future)
  const slides = [
    {
      id: 1,
      title: '50% Off Gourmet Burgers',
      subtitle: 'Satisfy your late-night cravings instantly.',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
      color: '#f97316', // Orange
      tag: 'Flash Sale'
    },
    {
      id: 2,
      title: 'The Tandoori Hub Special',
      subtitle: 'Authentic flavors, delivered steaming hot.',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
      color: '#ef4444', // Red
      tag: 'Featured Stall'
    },
    {
      id: 3,
      title: 'Craving Sweet?',
      subtitle: 'Fresh baked desserts right to your dorm.',
      image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80',
      color: '#8b5cf6', // Purple
      tag: 'New Arrivals'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

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

      {/* Integrated Search Bar (Glassmorphism) */}
      <div className="hero-search-wrapper">
        <form className="hero-search-form" onSubmit={handleSearchSubmit}>
          <Search size={20} className="hero-search-icon" />
          <input 
            type="text" 
            placeholder="Search for momos, cold coffee, wraps..." 
            className="hero-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="hero-search-btn">Search</button>
        </form>
      </div>
    </div>
  );
};

export default HeroCarousel;
