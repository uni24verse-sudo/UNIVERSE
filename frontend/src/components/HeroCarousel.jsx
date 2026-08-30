import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './HeroCarousel.css';

const HeroCarousel = ({ onSearch }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mock advertising data (this could come from DB in future)
  const slides = [
    {
      id: 1,
      title: 'Your Campus, Digitized',
      subtitle: 'Experience seamless food delivery right across the campus.',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80', // Veg salad bowl
      color: 'var(--primary)',
      tag: 'Welcome to UniVerse'
    },
    {
      id: 2,
      title: 'Skip the Line',
      subtitle: 'Order ahead and pick up your food fresh and hot.',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80', // Veg pizza
      color: 'var(--primary)',
      tag: 'Save Time'
    },
    {
      id: 3,
      title: 'Late Night Cravings?',
      subtitle: 'We are here to deliver your favorite midnight snacks.',
      image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80', // Sweet dessert
      color: 'var(--primary)',
      tag: 'Always Open'
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
                Explore Now
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
