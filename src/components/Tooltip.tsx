import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export default function Tooltip({ content, children, position = "right", delay = 0.25 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timeoutIdRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutIdRef.current = setTimeout(() => {
      setShow(true);
    }, delay * 1000);
  };

  const handleMouseLeave = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setShow(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // Determine positions classes
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-2.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-2.5",
  };

  const getAnimateCoords = () => {
    switch (position) {
      case "top": return { y: 6, opacity: 0, scale: 0.92 };
      case "bottom": return { y: -6, opacity: 0, scale: 0.92 };
      case "left": return { x: 6, opacity: 0, scale: 0.92 };
      case "right": return { x: -6, opacity: 0, scale: 0.92 };
    }
  };

  const getArrowStyle = () => {
    switch (position) {
      case "top":
        return "bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-slate-800 bg-slate-950";
      case "bottom":
        return "top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-l border-t border-slate-800 bg-slate-950";
      case "left":
        return "right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-r border-t border-slate-800 bg-slate-950";
      case "right":
        return "left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-l border-b border-slate-800 bg-slate-950";
    }
  };

  // We detect if children is a full-width block to adapt our wrapper
  const isFullWidth = children.props.className?.includes("w-full");

  const trigger = React.cloneElement(children, {
    onMouseEnter: (e: any) => {
      handleMouseEnter();
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    },
    onMouseLeave: (e: any) => {
      handleMouseLeave();
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    },
    onFocus: (e: any) => {
      setShow(true);
      if (children.props.onFocus) children.props.onFocus(e);
    },
    onBlur: (e: any) => {
      setShow(false);
      if (children.props.onBlur) children.props.onBlur(e);
    },
    onClick: (e: any) => {
      setShow(false);
      if (children.props.onClick) children.props.onClick(e);
    },
  });

  return (
    <div className={`relative ${isFullWidth ? "w-full" : "inline-block"}`} id="tooltip-container">
      {trigger}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={getAnimateCoords()}
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={getAnimateCoords()}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute z-[999] pointer-events-none ${positionClasses[position]}`}
          >
            <div className="bg-slate-950 text-[10px] sm:text-[11px] text-slate-100 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-2xl tracking-wide whitespace-nowrap leading-tight flex items-center gap-1.5">
              {content}
            </div>
            <div className={`absolute ${getArrowStyle()}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
