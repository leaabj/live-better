import { useEffect, useRef, useState } from "react";

interface SparklingProgressProps {
  percentage: number;
  className?: string;
  height?: "small" | "medium";
  showText?: boolean;
}

export function SparklingProgress({
  percentage,
  className = "",
  height = "medium",
  showText = true,
}: SparklingProgressProps) {
  const sparkleRef = useRef<HTMLDivElement>(null);
  const [sparkles, setSparkles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);
  const [displayPercentage, setDisplayPercentage] = useState(percentage);
  const prevPercentage = useRef(percentage);

  useEffect(() => {
    // Smooth animation for percentage changes
    const start = prevPercentage.current;
    const end = percentage;
    const duration = 600; // Animation duration in ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutQuart(progress);
      
      setDisplayPercentage(start + (end - start) * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    if (start !== end) {
      animate();
      prevPercentage.current = percentage;
    }
  }, [percentage]);

  // Easing function for smoother animation
  const easeOutQuart = (t: number) => {
    return 1 - Math.pow(1 - t, 4);
  };

  useEffect(() => {
    if (displayPercentage > 0 && displayPercentage < 100) {
      // Create continuous leaking sparkle effect with reduced frequency for smoother appearance
      const interval = setInterval(() => {
        const newSparkle = {
          id: Date.now() + Math.random(),
          x: (Math.random() - 0.5) * 12, // Reduced spread for more controlled effect
          y: (Math.random() - 0.5) * 16, // Reduced vertical variation
          delay: Math.random() * 300,
        };

        setSparkles((prev) => [...prev.slice(-3), newSparkle]); // Keep max 3 sparkles

        // Remove sparkle after animation completes
        setTimeout(() => {
          setSparkles((prev) => prev.filter((s) => s.id !== newSparkle.id));
        }, 1800);
      }, 150); // Slightly slower interval for smoother effect

      return () => clearInterval(interval);
    } else {
      // Clear sparkles when progress is complete or hasn't started
      setSparkles([]);
    }
  }, [displayPercentage]);

  const heightClasses = height === "small" ? "h-2" : "h-3";

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full bg-gray-700 rounded-full ${heightClasses} relative overflow-visible`}
      >
        {/* Progress bar fill */}
        <div
          className="bg-gradient-to-r from-yellow-300 to-yellow-100 h-full rounded-full relative will-change-transform"
          style={{ 
            width: `${displayPercentage}%`,
            transition: 'width 0.1s linear'
          }}
        >
          {/* Sparkle container positioned at the end of progress bar */}
          {displayPercentage > 0 && displayPercentage < 100 && (
            <div
              ref={sparkleRef}
              className="absolute right-0 top-1 transform -translate-y-0.2"
            >
              {/* Main sparkle glow with smoother animation */}
              <div className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-yellow-200 rounded-full opacity-80 animate-pulse blur-sm"></div>
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-yellow-100 rounded-full opacity-90 animate-pulse"></div>
              <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white rounded-full opacity-95 animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Leaking sparkles that float outside the progress bar */}
        {displayPercentage > 0 && displayPercentage < 100 && (
          <div className="absolute inset-0 pointer-events-none">
            {sparkles.map((sparkle, index) => {
              // Position sparkles at the end of progress bar but allow them to float outside
              const progressBarEnd = (displayPercentage / 100) * 100; // percentage of parent width
              const sparkleX = progressBarEnd + sparkle.x / 2;
              const sparkleSize = 1.5 + Math.random() * 1.5; // Random size between 1.5 and 3

              const animationClass =
                index % 3 === 0
                  ? "animate-leak-up"
                  : index % 3 === 1
                    ? "animate-leak-down"
                    : "animate-leak";

              return (
                <div
                  key={sparkle.id}
                  className={`absolute rounded-full ${animationClass}`}
                  style={{
                    left: `${sparkleX}%`,
                    top: `${50 + sparkle.y / 3}%`, // Center vertically with variation
                    animationDelay: `${sparkle.delay}ms`,
                    opacity: 0,
                    transform: "translate(-50%, -50%)",
                    width: `${sparkleSize}px`,
                    height: `${sparkleSize}px`,
                    background: `radial-gradient(circle, ${index % 2 === 0 ? "#fef3c7" : "#ffffff"}, ${index % 3 === 0 ? "#fde68a" : "#fbbf24"})`,
                    boxShadow: "0 0 8px rgba(251, 191, 36, 0.8)",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {showText && (
        <p className="text-sm text-gray-400 mt-2">
          {displayPercentage >= 99.5
            ? "All tasks completed! Great job!"
            : `${Math.round(displayPercentage)}% complete`}
        </p>
      )}
    </div>
  );
}
