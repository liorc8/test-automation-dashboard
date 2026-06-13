import React from "react";
import { Dialog, Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <Dialog
    open
    onClose={onClose}
    maxWidth={false}
    PaperProps={{ sx: { bgcolor: "transparent", boxShadow: "none", m: 0, overflow: "visible" } }}
    sx={{ "& .MuiBackdrop-root": { bgcolor: "rgba(0,0,0,0.9)" }, cursor: "zoom-out" }}
  >
    <Box sx={{ position: "relative" }}>
      <img
        src={src}
        alt="screenshot"
        style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8, boxShadow: "0 28px 64px rgba(0,0,0,0.7)", display: "block" }}
      />
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: "absolute", top: -14, right: -14,
          bgcolor: "#ef4444", color: "#fff", width: 28, height: 28,
          "&:hover": { bgcolor: "#dc2626" },
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  </Dialog>
);

export default ImageModal;
