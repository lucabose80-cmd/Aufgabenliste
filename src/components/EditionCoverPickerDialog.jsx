import { useState, useEffect } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, TextField, Button, IconButton, CircularProgress
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookCover from './BookCover';
import { searchBookCovers } from '../utils/bookCoverApi';
import { getLanguageMeta } from '../utils/bookLanguages';

const EditionCoverPickerBody = ({
  bookTitle,
  bookAuthor,
  langCode,
  initialCoverUrl,
  isNewEdition,
  onClose,
  onConfirm,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const langMeta = getLanguageMeta(langCode);
  const initialQuery = [bookTitle, bookAuthor].filter(Boolean).join(' ').trim();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [searched, setSearched] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(initialCoverUrl || '');
  const [customUrl, setCustomUrl] = useState(initialCoverUrl || '');

  const runSearch = async (q) => {
    const trimmed = (q || '').trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(false);
    const items = await searchBookCovers(trimmed, '', langCode);
    setResults(items);
    setLoading(false);
    setSearched(true);
  };

  useEffect(() => {
    if (!initialQuery) return undefined;
    let cancelled = false;
    searchBookCovers(initialQuery, '', langCode).then((items) => {
      if (cancelled) return;
      setResults(items);
      setLoading(false);
      setSearched(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initialQuery, langCode]);

  const effectiveUrl = (selectedUrl || customUrl || '').trim();

  return (
    <>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1, gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.25 }}>
            {langMeta.flag} Cover für {langMeta.label} wählen
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
            {isNewEdition
              ? `Bitte wähle das ${langMeta.label}-Cover aus — diese Ausgabe startet automatisch als aktiv (nicht abgeschlossen).`
              : `Neues Cover für die ${langMeta.label}-Ausgabe von „${bookTitle}“.`}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {/* Search Form */}
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          sx={{ display: 'flex', gap: 1 }}
        >
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              langCode === 'en'
                ? 'Englischer Originaltitel oder Autor...'
                : `${langMeta.label}-Titel oder Autor...`
            }
            size="small"
            fullWidth
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!query.trim() || loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ImageSearchIcon fontSize="small" />}
            sx={{ borderRadius: 9999, px: 2.25, flexShrink: 0 }}
          >
            Suchen
          </Button>
        </Box>

        {/* Results Grid */}
        {loading ? (
          <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={28} />
            <Typography variant="caption" color="text.secondary">
              Suche {langMeta.label}-Cover auf Apple Books, Open Library &amp; Google Books...
            </Typography>
          </Box>
        ) : results.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.25,
              maxHeight: 330,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            {results.map((item, idx) => {
              const isSelected = selectedUrl === item.url;
              return (
                <Box
                  key={idx}
                  onClick={() => {
                    setSelectedUrl(item.url);
                    setCustomUrl(item.url);
                  }}
                  sx={{
                    position: 'relative',
                    p: 1.25,
                    borderRadius: '16px',
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1)
                      : 'background.surfaceVariant',
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 0.65,
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {isSelected && (
                    <CheckCircleIcon
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 18,
                        color: 'primary.main',
                      }}
                    />
                  )}
                  <BookCover coverUrl={item.url} title={item.title} width={72} height={106} borderRadius="8px" />
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{
                      lineHeight: 1.2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                    {item.source}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : searched ? (
          <Box sx={{ p: 2.5, textAlign: 'center', borderRadius: '16px', bgcolor: 'background.surfaceVariant' }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Keine Treffer für „{query}“
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tipp: Gib den {langCode === 'en' ? 'englischen Originaltitel' : 'Originaltitel'} ein oder füge unten direkt eine Cover-URL ein.
            </Typography>
          </Box>
        ) : null}

        {/* Manual Cover URL Fallback */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {effectiveUrl && (
            <BookCover coverUrl={effectiveUrl} title={bookTitle} width={34} height={50} borderRadius="6px" />
          )}
          <TextField
            label="Oder eigene Cover-URL einfügen"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value);
              setSelectedUrl(e.target.value);
            }}
            placeholder="https://..."
            size="small"
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: 9999 }}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          disabled={!effectiveUrl}
          onClick={() => onConfirm(effectiveUrl)}
          sx={{ borderRadius: 9999, px: 2.5 }}
        >
          {isNewEdition ? `${langMeta.flag} ${langMeta.label} hinzufügen` : 'Cover übernehmen'}
        </Button>
      </DialogActions>
    </>
  );
};

/**
 * Interactive Cover Picker specifically for choosing a cover for a language edition
 * (e.g. when adding English or a second language, or changing an edition's cover).
 * Requires a cover selection (or manual URL) before confirming.
 */
const EditionCoverPickerDialog = ({
  open,
  bookTitle = '',
  bookAuthor = '',
  langCode = 'en',
  initialCoverUrl = '',
  isNewEdition = true,
  onClose,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    {open && (
      <EditionCoverPickerBody
        key={`${bookTitle}-${bookAuthor}-${langCode}-${isNewEdition}`}
        bookTitle={bookTitle}
        bookAuthor={bookAuthor}
        langCode={langCode}
        initialCoverUrl={initialCoverUrl}
        isNewEdition={isNewEdition}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    )}
  </Dialog>
);

export default EditionCoverPickerDialog;
