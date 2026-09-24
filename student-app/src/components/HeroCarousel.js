import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useLocation } from '../context/LocationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 24, 480);
const BANNER_HEIGHT = 220;

const getBannerImageUrl = (img) => {
  if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
  const base = apiClient.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
  return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
};

// Exact default campus slides from webapp (frontend/src/components/HeroCarousel.jsx)
const COLLEGE_SLIDES = [
  {
    id: 'default-1',
    title: 'Your Campus, Digitized',
    subtitle: 'Experience seamless food ordering right across the campus.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    tag: 'WELCOME TO UNIVERSE',
    color: '#EF4123',
    ctaText: 'Explore Now',
    hasTextOverlay: true,
  },
  {
    id: 'default-2',
    title: 'Skip the Line',
    subtitle: 'Order ahead and pick up your food fresh and hot.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    tag: 'SAVE TIME',
    color: '#EF4123',
    ctaText: 'Explore Now',
    hasTextOverlay: true,
  },
  {
    id: 'default-3',
    title: 'Craving Something Sweet?',
    subtitle: 'Pre-order your favorite desserts and pick them up hot and fresh.',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80',
    tag: 'FRESH & TASTY',
    color: '#EF4123',
    ctaText: 'Explore Now',
    hasTextOverlay: true,
  },
];

// Exact default city/external slides from webapp (frontend/src/components/HeroCarousel.jsx)
const CITY_SLIDES = [
  {
    id: 'default-city-1',
    title: "Your City's Best Bites",
    subtitle: 'Discover top-rated street food and local stalls around you.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
    tag: 'EXPLORE LOCAL',
    color: '#EF4123',
    ctaText: 'Explore Now',
    hasTextOverlay: true,
  },
  {
    id: 'default-city-2',
    title: 'Fresh & Hot',
    subtitle: 'From wok to box, order the freshest meals in your area.',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
    tag: 'AUTHENTIC TASTE',
    color: '#EF4123',
    ctaText: 'Explore Now',
    hasTextOverlay: true,
  },
  {
    id: 'default-city-3',
    title: 'Late Night Cravings?',
    subtitle: 'Find places that serve hot food exactly when you need it.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
    tag: 'NIGHT OWLS',
    color: '#EF4123',
    ctaText: 'Explore Now',
    hasTextOverlay: true,
  },
];

const HeroCarousel = ({ navigation, onExplore, hubName = 'Campus', hubType }) => {
  const { currentLocation } = useLocation();
  const [paidBanners, setPaidBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const isInteractingRef = useRef(false);

  const effectiveHubType = hubType || currentLocation?.type || 'College';
  const defaultSlides = effectiveHubType === 'College' ? COLLEGE_SLIDES : CITY_SLIDES;

  // Fetch active paid banners for current user's campus hub matching webapp line 78
  useEffect(() => {
    let isMounted = true;
    const fetchActiveBanners = async () => {
      try {
        const locationId = currentLocation?._id || currentLocation?.id || '';
        const targetHub = currentLocation?.name || hubName || '';
        const res = await apiClient.get('/banners/active', {
          params: { hub: targetHub, locationId },
        });

        if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
          const formatted = res.data.map((b, idx) => {
            const hasOverlay = Boolean(b.title && b.title.trim() !== '' && b.title !== '__NO_TEXT__');
            return {
              id: b.id || b._id || `banner-${idx}`,
              title: hasOverlay ? b.title : '',
              hasTextOverlay: hasOverlay,
              subtitle: hasOverlay ? (b.subtitle || `Exclusive offers from ${b.storeName || 'Campus Stall'}.`) : '',
              image: b.bannerUrl || b.rawAssetUrl || defaultSlides[idx % defaultSlides.length].image,
              color: '#EF4123',
              tag: hasOverlay ? (b.tag || (effectiveHubType === 'College' ? 'CAMPUS EXCLUSIVE' : 'FEATURED PLACE')) : '',
              stallId: b.stallId,
              targetUrl: b.targetUrl || (b.stallId ? `/store/${b.stallId}` : ''),
              ctaText: b.stallId ? 'Order from Stall' : 'Explore Now',
            };
          });
          setPaidBanners(formatted);
        } else if (isMounted) {
          setPaidBanners([]);
        }
      } catch (err) {
        console.warn('Could not load location hero banners, falling back to defaults:', err.message);
        if (isMounted) setPaidBanners([]);
      }
    };

    fetchActiveBanners();
    return () => {
      isMounted = false;
    };
  }, [currentLocation, hubName, effectiveHubType]);

  // Combine paid banners with fallback defaults matching webapp line 117
  const slides = paidBanners.length > 0 ? paidBanners : defaultSlides;

  // Reset slide index if slides change
  useEffect(() => {
    setCurrentIndex(0);
  }, [slides.length]);

  // Navigation handlers
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev === slides.length - 1 ? 0 : prev + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
  }, [slides.length]);

  // Smart Autoplay Timer (5000ms) matching webapp line 134
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      if (!isInteractingRef.current) {
        goToNextSlide();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length, goToNextSlide]);

  const handleSlideClick = (slide) => {
    if (slide.stallId && navigation) {
      navigation.navigate('StoreMenu', { id: slide.stallId });
    } else if (slide.targetUrl && navigation) {
      if (slide.targetUrl.startsWith('/store/')) {
        const sid = slide.targetUrl.replace('/store/', '').split('?')[0];
        navigation.navigate('StoreMenu', { id: sid });
      } else {
        navigation.navigate('Search');
      }
    } else if (onExplore) {
      onExplore();
    } else if (navigation) {
      navigation.navigate('Search');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => String(item.id || index)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onTouchStart={() => { isInteractingRef.current = true; }}
        onTouchEnd={() => { isInteractingRef.current = false; }}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={styles.slideOuter}>
            <TouchableOpacity
              style={styles.bannerCard}
              activeOpacity={0.92}
              onPress={() => handleSlideClick(item)}
            >
              {/* Slide Background Image */}
              <Image
                source={{ uri: getBannerImageUrl(item.image) }}
                style={styles.bannerImage}
                resizeMode="cover"
              />

              {/* Text Overlay matching webapp: only when hasTextOverlay !== false and title exists */}
              {item.hasTextOverlay !== false && item.title ? (
                <>
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(15, 23, 42, 0.08)',
                      'rgba(15, 23, 42, 0.55)',
                      'rgba(15, 23, 42, 0.90)',
                    ]}
                    locations={[0, 0.35, 0.65, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.gradientOverlay, { pointerEvents: 'none' }]}
                  />

                  {/* Pinned Bottom Content Container */}
                  <View style={[styles.bottomContentContainer, { pointerEvents: 'box-none' }]}>
                    {/* Tag Badge */}
                    {item.tag ? (
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{item.tag}</Text>
                      </View>
                    ) : null}

                    {/* Headline Title */}
                    <Text style={styles.bannerTitle} numberOfLines={1}>
                      {item.title}
                    </Text>

                    {/* Bottom Action Row: CTA button + Dot Controls */}
                    <View style={styles.bottomRow}>
                      <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => handleSlideClick(item)}
                        activeOpacity={0.82}
                      >
                        <Text style={styles.ctaButtonText}>
                          {item.ctaText || (item.stallId ? 'Order from Stall' : 'Explore Now')}
                        </Text>
                        <Feather name="arrow-right" size={13} color="#FFFFFF" />
                      </TouchableOpacity>

                      {/* Indicator Dots inside card bottom-right */}
                      <View style={styles.dotsContainer}>
                        {slides.map((_, dotIdx) => (
                          <TouchableOpacity
                            key={dotIdx}
                            onPress={() => {
                              flatListRef.current?.scrollToIndex({ index: dotIdx, animated: true });
                              setCurrentIndex(dotIdx);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                          >
                            <View
                              style={[
                                styles.dot,
                                currentIndex === dotIdx ? styles.activeDot : styles.inactiveDot,
                              ]}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                /* Poster-only banner (e.g. designed vendor flyer without text overlay) */
                <View style={styles.posterDotsOverlay}>
                  <View style={styles.dotsContainer}>
                    {slides.map((_, dotIdx) => (
                      <TouchableOpacity
                        key={dotIdx}
                        onPress={() => {
                          flatListRef.current?.scrollToIndex({ index: dotIdx, animated: true });
                          setCurrentIndex(dotIdx);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        <View
                          style={[
                            styles.dot,
                            currentIndex === dotIdx ? styles.activeDot : styles.inactiveDot,
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  slideOuter: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  bottomContentContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 10,
    elevation: 6,
  },
  posterDotsOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    zIndex: 10,
  },
  tagBadge: {
    backgroundColor: '#EF4123',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 100,
    marginBottom: 5,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
    letterSpacing: -0.3,
    marginBottom: 8,
    ...Platform.select({
      web: {
        textShadow: '0px 2px 6px rgba(0, 0, 0, 0.7)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.7)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
      },
    }),
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4123',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 100,
    gap: 5,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 2,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#EF4123',
  },
  inactiveDot: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});

export default HeroCarousel;
