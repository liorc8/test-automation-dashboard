import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button } from "@mui/material";
import { renderLogLines } from "./failureHelpers";

interface LogModalProps {
  lines: string[];
  testName: string;
  reasonLabel: string;
  onClose: () => void;
}

const LogModal: React.FC<LogModalProps> = ({ lines, testName, reasonLabel, onClose }) => (
  <Dialog
    open
    onClose={onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{ sx: { bgcolor: "#000000", backgroundImage: "none", border: "1px solid #1e293b", borderRadius: 3, boxShadow: "0 32px 80px rgba(0,0,0,0.65)" } }}
  >
    <DialogTitle sx={{ borderBottom: "1px solid #1e293b", pb: 1.5 }}>
      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#f1f5f9", mb: 0.375 }}>
        {testName}
      </Typography>
      <Typography variant="caption" sx={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {reasonLabel}&nbsp;·&nbsp;Chronological&nbsp;·&nbsp;Truncated at test entry
      </Typography>
    </DialogTitle>
    <DialogContent sx={{ p: 0, overflowY: "auto" }}>
      <Box sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11, py: 1.25 }}>
        {renderLogLines(lines)}
      </Box>
    </DialogContent>
    <DialogActions sx={{ borderTop: "1px solid #1e293b", justifyContent: "space-between", px: 2.5, py: 1 }}>
      <Typography variant="caption" sx={{ color: "#64748b" }}>
        {lines.length} lines shown · FATAL at bottom
      </Typography>
      <Button size="small" onClick={onClose} sx={{ color: "#94a3b8", textTransform: "none" }}>
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default LogModal;
