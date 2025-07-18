import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const AnimatedPanel = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.1
          }}
          className={className}
          whileHover={{
            y: -4,
            transition: { duration: 0.2, ease: "easeOut" }
          }}
          whileTap={{
            scale: 0.98,
            transition: { duration: 0.1, ease: "easeOut" }
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const StaggeredGrid = ({ children, className = "" }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export const PremiumCard = ({ children, className = "", hover = true, glow = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`premium-card ${glow ? 'shadow-glow' : ''} ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={hover ? {
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      } : {}}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeOut" }
      }}
      animate={{
        boxShadow: isHovered && glow 
          ? "0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 30px rgba(253, 216, 53, 0.2)"
          : "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
};

export const MetallicSurface = ({ children, className = "", shine = true }) => {
  return (
    <motion.div
      className={`metallic-surface ${className}`}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeOut" }
      }}
    >
      {shine && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
};

export const GlassPanel = ({ children, className = "", blur = true }) => {
  return (
    <motion.div
      className={`glass-panel ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
    >
      {children}
    </motion.div>
  );
};

export const StatusIndicator = ({ status, size = "md", pulse = false }) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3", 
    lg: "w-4 h-4"
  };

  const statusClasses = {
    online: "status-online",
    warning: "status-warning",
    critical: "status-critical",
    info: "status-info"
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${statusClasses[status]} rounded-full`}
      animate={pulse ? {
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1]
      } : {}}
      transition={pulse ? {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    />
  );
};

export const ProgressBar = ({ value, max = 100, color = "nexus-gold", animated = true }) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="progress-bar-premium h-2">
      <motion.div
        className={`progress-fill-premium bg-${color}`}
        initial={animated ? { width: 0 } : {}}
        animate={{ width: `${percentage}%` }}
        transition={animated ? {
          duration: 1,
          ease: "easeOut"
        } : {}}
      />
    </div>
  );
};

export const FloatingActionButton = ({ children, onClick, className = "" }) => {
  return (
    <motion.button
      className={`w-12 h-12 bg-gradient-to-br from-nexus-gold to-yellow-400 rounded-full shadow-premium flex items-center justify-center text-obsidian font-display font-semibold ${className}`}
      onClick={onClick}
      whileHover={{
        scale: 1.1,
        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 30px rgba(253, 216, 53, 0.4)"
      }}
      whileTap={{
        scale: 0.95,
        transition: { duration: 0.1, ease: "easeOut" }
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.button>
  );
};

export const DataCard = ({ title, value, change, icon: Icon, trend, className = "" }) => {
  const isPositive = trend === 'up';
  
  return (
    <PremiumCard className={`p-6 ${className}`} glow={true}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${isPositive ? 'bg-accent-emerald/20' : 'bg-accent-rose/20'} flex items-center justify-center rounded-refined border border-border-razor`}>
          <Icon className={`w-6 h-6 ${isPositive ? 'text-accent-emerald' : 'text-accent-rose'}`} />
        </div>
        <div className="text-right">
          <div className={`text-xs font-medium ${isPositive ? 'text-accent-emerald' : 'text-accent-rose'}`}>
            {change}
          </div>
          <div className="text-xs text-text-muted">vs last period</div>
        </div>
      </div>
      <div>
        <p className="text-text-secondary text-caption font-medium mb-1">{title}</p>
        <p className="text-display-3 font-display font-semibold text-text-primary mb-2">{value}</p>
        <ProgressBar 
          value={Math.abs(parseFloat(change.replace(/[^0-9.-]/g, '')))} 
          max={20} 
          color={isPositive ? 'accent-emerald' : 'accent-rose'}
        />
      </div>
    </PremiumCard>
  );
};

export const MetricCard = ({ title, value, unit, target, icon: Icon, status, className = "" }) => {
  const percentage = (value / target) * 100;
  const isWarning = status === 'warning';
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="w-4 h-4 text-text-secondary" />
          <span className="text-sm text-text-primary font-medium">{title}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-display font-semibold text-text-primary">
            {value}{unit}
          </span>
          <div className="text-xs text-text-muted">Target: {target}{unit}</div>
        </div>
      </div>
      <ProgressBar 
        value={percentage} 
        max={100} 
        color={isWarning ? 'accent-amber' : 'accent-emerald'}
      />
    </div>
  );
}; 