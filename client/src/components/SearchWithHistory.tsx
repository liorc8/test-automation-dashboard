import React, { useState } from "react";
import {
  Box, TextField, InputAdornment, IconButton, Paper, List, ListItem,
  ListItemButton, ListItemText, ClickAwayListener,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import { useSearchHistory } from "../hooks/useSearchHistory";

interface SearchWithHistoryProps {
  value: string;
  onSearch: (value: string) => void;
  storageKey: string;
  placeholder?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

const SearchWithHistory: React.FC<SearchWithHistoryProps> = ({
  value, onSearch, storageKey, placeholder = "Search…", fullWidth = false, sx,
}) => {
  const { history, remove, push } = useSearchHistory(storageKey);
  const [open, setOpen] = useState(false);

  const applyHistory = (term: string) => {
    onSearch(term);
    push(term);
    setOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative", width: fullWidth ? "100%" : "auto", ...(sx as object) }}>
        <TextField
          size="small"
          fullWidth
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => onSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => onSearch("")}>
                  <CloseIcon fontSize="small" sx={{ color: "text.disabled" }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
          sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.paper" }, "& .MuiOutlinedInput-input": { color: "text.primary" } }}
        />

        {open && value.trim() === "" && history.length > 0 && (
          <Paper
            elevation={8}
            data-testid="search-history-dropdown"
            sx={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              mt: 0.5,
              zIndex: 1300,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
            }}
          >
            <List dense disablePadding sx={{ maxHeight: 250, overflowY: "auto" }} data-testid="search-history-list">
              {history.map((term) => (
                <ListItem
                  key={term}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={`Remove ${term} from history`}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => { e.stopPropagation(); remove(term); }}
                    >
                      <CloseIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHistory(term)}
                    sx={{ pr: 6 }}
                  >
                    <HistoryIcon fontSize="small" sx={{ color: "text.disabled", mr: 1 }} />
                    <ListItemText primary={term} primaryTypographyProps={{ noWrap: true, fontSize: 13, color: "text.primary" }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default SearchWithHistory;
