import React, { useEffect, useState } from "react";
import { Fab, Fade } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

interface BackToTopButtonProps {
  /** Scroll distance (px) past which the button appears. */
  threshold?: number;
}

/** Fixed bottom-right button that scrolls the window to the top. Shows after `threshold` px. */
const BackToTopButton: React.FC<BackToTopButtonProps> = ({ threshold = 400 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <Fade in={visible}>
      <Fab
        size="medium"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        sx={{
          position: "fixed", bottom: 32, right: 32, zIndex: 1200,
          bgcolor: "#1e293b", color: "#f1f5f9",
          boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          "&:hover": { bgcolor: "#334155" },
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Fade>
  );
};

export default BackToTopButton;
