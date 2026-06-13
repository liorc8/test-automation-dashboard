import React from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search by test name…",
  fullWidth = false,
  sx,
}) => {
  return (
    <TextField
      size="small"
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => onChange("")}>
              <CloseIcon fontSize="small" sx={{ color: "text.disabled" }} />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
      sx={sx}
    />
  );
};

export default SearchInput;
