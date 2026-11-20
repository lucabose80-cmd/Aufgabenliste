import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  PRIMARY_LANGUAGES,
  EXTRA_LANGUAGES,
  normalizeLanguages,
  getLanguageMeta,
  toggleLanguageInList,
  isBilingual,
  formatLanguagesCompact,
  formatLanguagesText,
} from '../utils/bookLanguages';

/**
 * Compact overlay pill positioned in the bottom-left corner of a book cover.
 */
export const LanguageCoverBadge = ({ languages, size = 'md' }) => {
  const langs = normalizeLanguages(languages);
  if (langs.length === 0) return null;

  const bilingual = isBilingual(langs);
  const small = size === 'sm';

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: small ? 3 : 6,
        left: small ? 3 : 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        px: small ? 0.5 : 0.7,
        py: small ? 0.05 : 0.15,
        borderRadius: 9999,
        bgcolor: 'rgba(19, 19, 20, 0.86)',
        backdropFilter: 'blur(6px)',
        color: '#F1F3F4',
        fontSize: small ? '0.56rem' : '0.62rem',
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: '0.02em',
        border: '1px solid',
        borderColor: bilingual
          ? 'rgba(138, 180, 248, 0.65)'
          : 'rgba(255, 255, 255, 0.14)',
        boxShadow: bilingual
          ? '0 2px 8px rgba(94, 151, 246, 0.35)'
          : '0 2px 6px rgba(0, 0, 0, 0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      {formatLanguagesCompact(langs)}
    </Box>
  );
};

/**
 * Inline pill badge for metadata rows, 2D map nodes, and session cards.
 */
export const LanguagePill = ({ languages, compact = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const langs = normalizeLanguages(languages);
  if (langs.length === 0) return null;

  const bilingual = isBilingual(langs);

  if (bilingual) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.4,
          px: compact ? 0.8 : 1,
          py: 0.2,
          borderRadius: 9999,
          background: isDark
            ? 'linear-gradient(135deg, rgba(245, 176, 65, 0.22) 0%, rgba(94, 151, 246, 0.24) 100%)'
            : 'linear-gradient(135deg, rgba(245, 176, 65, 0.2) 0%, rgba(94, 151, 246, 0.18) 100%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(138, 180, 248, 0.38)' : 'rgba(26, 115, 232, 0.28)',
          color: 'text.primary',
          fontSize: compact ? '0.65rem' : '0.7rem',
          fontWeight: 700,
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
        }}
      >
        {compact
          ? langs.map((c) => {
              const m = getLanguageMeta(c);
              return `${m.flag} ${m.short}`;
            }).join(' · ')
          : formatLanguagesText(langs)}
      </Box>
    );
  }

  const meta = getLanguageMeta(langs[0]);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        px: compact ? 0.8 : 1,
        py: 0.2,
        borderRadius: 9999,
        bgcolor: alpha(meta.accent, isDark ? 0.18 : 0.13),
        border: '1px solid',
        borderColor: alpha(meta.accent, isDark ? 0.3 : 0.25),
        color: isDark ? '#E8EAED' : '#1F1F1F',
        fontSize: compact ? '0.65rem' : '0.7rem',
        fontWeight: 600,
        lineHeight: 1.35,
        whiteSpace: 'nowrap',
      }}
    >
      {compact ? `${meta.flag} ${meta.short}` : `${meta.flag} ${meta.label}`}
    </Box>
  );
};

/**
 * Interactive 1-tap multi-select language picker (DE & EN prominent, optional extra languages).
 */
export const LanguagePicker = ({ value = [], onChange, compact = false, showHint = true }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const selected = normalizeLanguages(value);
  const hasExtraSelected = selected.some((c) => !PRIMARY_LANGUAGES.some((p) => p.code === c));
  const [showMore, setShowMore] = useState(hasExtraSelected);

  const visibleLanguages = showMore || hasExtraSelected
    ? [...PRIMARY_LANGUAGES, ...EXTRA_LANGUAGES]
    : PRIMARY_LANGUAGES;

  const bilingual = isBilingual(selected);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
        {visibleLanguages.map((lang) => {
          const active = selected.includes(lang.code);
          return (
            <Box
              key={lang.code}
              onClick={() => onChange(toggleLanguageInList(selected, lang.code))}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: compact ? 1.25 : 1.5,
                py: compact ? 0.5 : 0.65,
                borderRadius: 9999,
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: compact ? '0.76rem' : '0.82rem',
                fontWeight: active ? 700 : 500,
                bgcolor: active
                  ? alpha(lang.accent, isDark ? 0.24 : 0.16)
                  : 'background.surfaceVariant',
                color: active ? 'text.primary' : 'text.secondary',
                border: '1.5px solid',
                borderColor: active ? lang.accent : 'transparent',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.96)' },
              }}
            >
              <span>{lang.flag}</span>
              <span>{compact ? lang.short : lang.label}</span>
            </Box>
          );
        })}

        {!showMore && !hasExtraSelected && (
          <Box
            onClick={() => setShowMore(true)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              px: 1.15,
              py: compact ? 0.5 : 0.65,
              borderRadius: 9999,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: compact ? '0.72rem' : '0.76rem',
              fontWeight: 500,
              color: 'text.secondary',
              border: '1px dashed',
              borderColor: 'divider',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              '&:hover': { color: 'text.primary', borderColor: 'text.secondary' },
            }}
          >
            <TranslateIcon sx={{ fontSize: 13 }} />
            + Weitere
          </Box>
        )}
      </Box>

      {showHint && (
        <Typography variant="caption" color={bilingual ? 'primary.main' : 'text.secondary'} sx={{ fontSize: '0.7rem', fontWeight: bilingual ? 600 : 400 }}>
          {bilingual
            ? `✨ Mehrsprachig markiert (${selected.map((c) => getLanguageMeta(c).short).join(' + ')}) — wird in der Map als Doppelausgabe angezeigt.`
            : 'Tipp: Beide antippen, wenn du das Buch auf Deutsch & Englisch gelesen hast.'}
        </Typography>
      )}
    </Box>
  );
};
