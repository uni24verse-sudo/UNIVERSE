import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './HeroCarousel.css';

const HeroCarousel = ({ onSearch, hubType = 'College' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const collegeSlides = [
    {
      id: 1,
      title: 'Your Campus, Digitized',
      subtitle: 'Experience seamless food ordering right across the campus.',
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
      title: 'Craving Something Sweet?',
      subtitle: 'Pre-order your favorite desserts and pick them up hot and fresh.',
      image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80', // Sweet dessert
      color: 'var(--primary)',
      tag: 'Fresh & Tasty'
    }
  ];

  const citySlides = [
    {
      id: 1,
      title: 'Your City\'s Best Bites',
      subtitle: 'Discover top-rated street food and local stalls around you.',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', // Street food
      color: 'var(--primary)',
      tag: 'Explore Local'
    },
    {
      id: 2,
      title: 'Fresh & Hot',
      subtitle: 'From wok to box, order the freshest meals in your area.',
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80', // Hot food
      color: 'var(--primary)',
      tag: 'Authentic Taste'
    },
    {
      id: 3,
      title: 'Late Night Cravings?',
      subtitle: 'Find places that serve hot food exactly when you need it.',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80', // Late night food
      color: 'var(--primary)',
      tag: 'Night Owls'
    }
  ];

  const slides = hubType === 'College' ? collegeSlides : citySlides;

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
