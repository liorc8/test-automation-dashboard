import React from "react";
import { Box } from "@mui/material";
import type { EnvFilter } from "../services/apiService";

type Props = {
  value: EnvFilter;
  onChange: (env: EnvFilter) => void;
};

const ENV_OPTIONS: { value: EnvFilter; label: string; activeColor: string }[] = [
  { value: "qa",      label: "QA",      activeColor: "#2563eb" },
  { value: "release", label: "Release", activeColor: "#7c3aed" },
  { value: "sandbox", label: "Sandbox", activeColor: "#059669" },
];

const EnvToggle: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Box sx={{
      display: "flex",
      background: "#f1f5f9",
      borderRadius: 2,
      p: "3px",
      gap: "2px",
    }}>
      {ENV_OPTIONS.map((opt) => (
        <Box
          key={opt.value}
          component="button"
          onClick={() => onChange(opt.value)}
          sx={{
            px: 2.5, py: 0.8,
            borderRadius: 1.5,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "all 0.15s",
            background: value === opt.value ? "#fff" : "transparent",
            color: value === opt.value ? opt.activeColor : "#94a3b8",
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          {opt.label}
        </Box>
      ))}
    </Box>
  );
};

export default EnvToggle;