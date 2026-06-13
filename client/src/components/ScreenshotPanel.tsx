import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

interface ScreenshotPanelProps {
  src: string | null;
  onClick: (src: string) => void;
}

const ScreenshotPanel: React.FC<ScreenshotPanelProps> = ({ src, onClick }) => {
  const [errored, setErrored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const missing = !src || errored;

  if (missing) {
    return (
      <Box sx={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 1.25, borderRight: "1px solid #2d3f55",
      }}>
        <BrokenImageIcon sx={{ fontSize: 42, color: "#475569" }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#64748b", textAlign: "center", lineHeight: 1.4, px: 2.5 }}>
          Screenshot not captured
        </Typography>
        <Typography variant="caption" sx={{ color: "#475569", textAlign: "center", maxWidth: 200, lineHeight: 1.5 }}>
          Failed to capture during test execution
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{ width: "100%", height: "100%", cursor: "zoom-in", position: "relative" }}
      onClick={() => onClick(src!)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={src!}
        alt="failure screenshot"
        onError={() => setErrored(true)}
        style={{
          width: "100%", height: "100%",
          objectFit: "contain", objectPosition: "center",
          display: "block",
          transition: "transform 0.22s ease",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      />
      <Box sx={{
        position: "absolute", inset: 0,
        background: "rgba(15,23,42,0.52)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}>
        <ZoomInIcon sx={{ fontSize: 40, color: "#fff" }} />
      </Box>
    </Box>
  );
};

export default ScreenshotPanel;
