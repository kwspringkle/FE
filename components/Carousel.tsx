"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface CarouselProps {
  items: Array<{
    title: string;
    description?: string;
    image: string;
    features?: string[];
  }>;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
}

export function Carousel({ 
  items, 
  autoPlay = true, 
  autoPlayInterval = 5000,
  showNavigation = true 
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, items.length]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % items.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

  return (
    <div className="relative">
      {/* Navigation Buttons */}
      {showNavigation && items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full border border-border bg-background/80 hover:bg-background hover:border-foreground transition-all shadow-lg"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full border border-border bg-background/80 hover:bg-background hover:border-foreground transition-all shadow-lg"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </>
      )}

      {/* Carousel Content */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, idx) => (
            <div key={idx} className="min-w-full px-2">
              {item.features ? (
                // About Section Layout
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="w-full h-64 rounded-2xl bg-secondary overflow-hidden relative">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-base text-muted-foreground leading-relaxed mb-6">
                      {item.description}
                    </p>
                    {item.features && (
                      <ul className="space-y-3">
                        {item.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-3">
                            <span className="text-primary font-bold mt-1">•</span>
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                // Features Section Layout - Show 3 items at once
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Show current item and next 2 items */}
                  {[0, 1, 2].map((offset) => {
                    const itemIdx = (currentIndex + offset) % items.length;
                    const feature = items[itemIdx];
                    return (
                      <div
                        key={itemIdx}
                        className={`p-0 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                          offset === 0
                            ? "border-primary bg-background shadow-lg scale-105"
                            : "border-border bg-secondary/30"
                        }`}
                      >
                        <div className="w-full h-48 relative bg-secondary">
                          <Image
                            src={feature.image}
                            alt={feature.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-8">
                          <h4 className="text-lg font-semibold text-foreground mb-2 text-center">
                            {feature.title}
                          </h4>
                          {feature.description && (
                            <p className="text-sm text-muted-foreground text-center leading-relaxed">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? "bg-primary w-8"
                  : "bg-border hover:bg-muted-foreground"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

