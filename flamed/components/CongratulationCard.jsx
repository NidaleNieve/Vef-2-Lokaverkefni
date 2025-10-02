// emojis from unicode.org
// framer motion for animations
'use client';

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function CongratulationCard({ restaurantNames, isVisible }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible || !restaurantNames || restaurantNames.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-[var(--nav-item-bg)] border border-[var(--accent)] rounded-lg p-6 my-4 relative overflow-hidden"
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        duration: 0.8, 
        bounce: 0.4 
      }}
    >
      {/* confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: '0%',
              }}
              initial={{
                x: Math.random() * 300 - 150,
                y: 300,
                opacity: 1,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{
                y: -50,
                x: Math.random() * 300 - 150,
                opacity: 0,
                rotate: Math.random() * 360
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 0.5,
                ease: "easeOut"
              }}
            >
              {['🎉', '✨', '🎊', '🌟', '💫'][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}
        </div>
      )}

      {/* background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-4 left-4 text-2xl">🎉</div>
        <div className="absolute top-4 right-4 text-2xl">✨</div>
        <div className="absolute bottom-4 left-4 text-2xl">🍽️</div>
        <div className="absolute bottom-4 right-4 text-2xl">🎊</div>
      </div>

      <div className="relative z-10 text-center">
        {/* main title */}
        <motion.h2 
          className="text-2xl font-bold text-[var(--nav-text)] mb-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          🎉 Congratulations! 🎉
        </motion.h2>

        {/* subtitle */}
        <motion.p 
          className="text-[var(--muted)] mb-4"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Your group has chosen:
        </motion.p>

        {/* restaurant names */}
        <motion.div
          className="mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          {restaurantNames.length === 1 ? (
            <h3 className="text-xl font-semibold text-[var(--foreground)] bg-[var(--nav-item-hover)] rounded-lg py-2 px-4 inline-block">
              {restaurantNames[0]}
            </h3>
          ) : (
            <div className="space-y-2">
              {restaurantNames.map((name, index) => (
                <motion.h3 
                  key={index}
                  className="text-lg font-medium text-[var(--foreground)] bg-[var(--nav-item-hover)] rounded-lg py-2 px-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                >
                  🍴 {name}
                </motion.h3>
              ))}
            </div>
          )}
        </motion.div>

        {/* call to Action */}
        <motion.p 
          className="text-[var(--nav-text)] font-medium"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          Time to pick a game! 
        </motion.p>
      </div>

      {/* animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        animate={{ 
          boxShadow: [
            "0 0 20px rgba(214, 154, 222, 0.3)",
            "0 0 40px rgba(214, 154, 222, 0.5)",
            "0 0 20px rgba(214, 154, 222, 0.3)"
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
    </motion.div>
  );
}