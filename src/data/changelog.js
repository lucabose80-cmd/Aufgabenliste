export const APP_VERSION = '2.4.2';

export const CHANGELOG_ENTRIES = [
  {
    version: '2.4.2',
    date: '20.11.2026',
    title: 'Themen-Tags für Bücher (Magie, Drachen, Schwertkampf, Moderne & mehr)',
    highlights: [
      'Neue unauffällige Themen-Tags pro Buch: Magie, Drachen, Schwertkampf, Moderne, Fae, Akademie, Mittelalter, Enemies to Lovers, Found Family, Royals, Hexen, Vampire u. v. m. — per 1-Tap-Schnellauswahl oder frei eintippbar (beim Bearbeiten & im Map-Detail).',
      'Kombinierte Erkennung + Filterung: Klare Themen-Tags werden im Hintergrund leise aus den APIs mitvorbefüllt (manuelle Auswahl bleibt immer erhalten) und lassen sich über das dezente Filter-Icon unter „Bücher“ und in der „Map“ filtern.',
    ],
  },
  {
    version: '2.4.1',
    date: '20.11.2026',
    title: 'Automatische Genre-Erkennung im Hintergrund (inkl. Open Library)',
    highlights: [
      'Vollautomatische Genre-Erkennung im Hintergrund: Alle bestehenden und neuen Bücher ohne Kategorie werden jetzt still im Hintergrund über Open Library (`subject`-Tags), Apple Books und Google Books (inkl. Beschreibung) klassifiziert.',
      'Treffsicherere Erkennung u. a. für Romantasy vs. Fantasy, Romance, Dystopie, Thriller, Krimi & Sci-Fi — manuelle Änderungen werden niemals überschrieben.',
    ],
  },
  {
    version: '2.4.0',
    date: '20.11.2026',
    title: 'Getrennte Sprach-Bewertungen, differenziertes Tracking, Map-Vordergrund & dezente Genres',
    highlights: [
      'Getrennte Bewertungen & Fazits pro Sprache: Mehrsprachige Bücher können jetzt für Deutsch und Englisch unabhängig mit 1–10 Sternen und eigenem Fazit bewertet werden (im Bearbeiten-Dialog, beim Abschließen & im Map-Detail).',
      'Differenzierte Einträge pro Sprache: Unter „Bücher“ und im Timer bekommt jede Sprache eines mehrsprachigen Buchs ihren eigenen Eintrag mit eigenem Cover, eigener optionaler Seitenzahl, separatem Fortschrittsbalken und unabhängigem Abschluss-Status.',
      'Vorderes Cover auf der Map wählbar: Bei Doppelausgaben lässt sich im Map-Detail per 1-Tap (⇄ / „Vorne anzeigen“) festlegen, welche Sprache auf der Map vorne steht.',
      'Unauffällige Buch-Kategorien / Genres: Im Hintergrund können Genres wie Romantasy, Fantasy, Sci-Fi, Thriller etc. hinterlegt werden (inkl. leisem Auto-Fill bei der Buchsuche) — zum ruhigen Sortieren & Filtern über das dezente Filter-Symbol ohne überladene Badges.',
    ],
  },
  {
    version: '2.3.0',
    date: '20.11.2026',
    title: 'Eigene Cover & Status pro Sprache + deutlichere Doppelausgaben',
    highlights: [
      'Pflicht-Cover für Englisch & jede weitere Sprache: Beim Hinzufügen von Englisch oder einer zweiten Sprache öffnet sich direkt die Cover-Auswahl (inkl. englischer Suche über Apple Books US/GB & Google Books).',
      'Eigener Abschluss-Status pro Sprache: Eine neu hinzugefügte Sprache startet automatisch als aktiv (nicht abgeschlossen) — das Buch erscheint wieder unter „Aktive Bücher“ & im Timer und zeigt auf der Map 1/2 ✓ statt komplett abgeschlossen.',
      'Deutlicheres Hintereinander-Stehen in der Map: Beide Cover stehen jetzt klar versetzt und leicht gefächert hintereinander (mit tiefem Schatten & Sprach-Flagge auf dem hinteren Cover) — sowohl im Cover-Regal als auch in der 2D-Map.',
    ],
  },
  {
    version: '2.2.0',
    date: '20.11.2026',
    title: 'Sprachen im Lesebereich & Mehrsprachige Bücher auf der Map',
    highlights: [
      'Sprachauswahl (🇩🇪 Deutsch, 🇬🇧 Englisch & optional weitere) für Bücher — Mehrfachauswahl möglich, direkt beim Hinzufügen/Bearbeiten, beim Abschließen oder per 1-Tap im Map-Detail.',
      'Doppelausgaben-Look in der Map: Bücher, die du auf beiden Sprachen gelesen hast (als ein Eintrag mit DE + EN oder als getrennte Ausgaben desselben Bandes), erscheinen als gestapelte Doppelausgabe mit 🇩🇪·🇬🇧-Badge im Cover-Regal & in der 2D-Map (inkl. Ausgaben-Switcher im Detail-Modal).',
      'Sprachfilter in Bücher & Map sowie neue Sprachen-Übersicht & Sprachfilter (Seiten, Zeit & Tempo S/h für DE vs. EN) in der Lese-Statistik.',
    ],
  },
  {
    version: '2.1.2',
    date: '20.11.2026',
    title: 'Sauberere Bottom-Navigation ohne graues Rechteck',
    highlights: [
      'Der rechteckige graue Tap-/Ripple-Hintergrund auf den Buttons in der unteren Navigationsleiste wurde entfernt — beim Antippen reagiert jetzt nur noch sauber die abgerundete Icon-Pille.',
    ],
  },
  {
    version: '2.1.1',
    date: '20.11.2026',
    title: 'Bewertungs-Badge direkt auf Buchcovern',
    highlights: [
      'Buchbewertungen (★ 1–10) werden jetzt direkt als kleines goldenes Badge unten rechts auf den Buchcovern im Regal und in der Bücherliste angezeigt.',
    ],
  },
  {
    version: '2.1.0',
    date: '20.11.2026',
    title: 'Schnell-Chips, Buch-Auto-Fill & 1–10 Bewertung',
    highlights: [
      'Einkaufsliste: Neue „Häufig gekauft“-Schnell-Chips für deine bis zu 8 meistgekauften Artikel zum 1-Tap-Hinzufügen.',
      'Bücher Auto-Fill: Beim Suchen eines Buchs werden jetzt neben dem Cover automatisch auch Autor & Gesamtseiten übernommen.',
      'Bewertung & Notizen: Optional 1–10 Sterne und ein kurzes Fazit oder Lieblingszitat — direkt beim Bearbeiten, beim Abschließen oder im Cover-Regal-Detail.',
    ],
  },
  {
    version: '2.0.5',
    date: '20.11.2026',
    title: 'Offline-Hinweis aktualisiert',
    highlights: [
      'Der veraltete rote Offline-Fehlerbanner auf der Aufgabenseite wurde durch einen dezenten Hinweis ersetzt, dass Änderungen lokal gespeichert und später automatisch synchronisiert werden.',
    ],
  },
  {
    version: '2.0.4',
    date: '19.11.2026',
    title: 'Kompaktes 2×2 Lese-Timer-Widget',
    highlights: [
      'Das Lese-Timer-Widget ist jetzt standardmäßig halb so breit (2×2) mit kompaktem Layout für Buchauswahl, Timer und Start/Pause/Stopp.',
    ],
  },
  {
    version: '2.0.3',
    date: '19.11.2026',
    title: 'Update-Verlauf (Changelog)',
    highlights: [
      'Neuer Update-Verlauf in den Einstellungen — zeigt jederzeit übersichtlich alle Änderungen pro Version.',
      'Die Benachrichtigungsglocke übernimmt ab sofort automatisch die aktuellen Update-Highlights.',
    ],
  },
  {
    version: '2.0.2',
    date: '19.11.2026',
    title: 'Offline-first OTA Live-Updates',
    highlights: [
      'Automatische Over-the-Air-Updates mit SHA-256-Prüfsumme — neue Features landen ohne APK-Neuinstallation direkt in der App.',
      'Manueller „Nach Updates suchen“-Button mit Statusanzeige in den Einstellungen.',
    ],
  },
  {
    version: '2.0.0',
    date: '19.11.2026',
    title: 'Google-One-Redesign, Widgets & neues Lese-Abteil',
    highlights: [
      'Einheitliches, modernes Google-One-Design (Dark & Light) in der gesamten App.',
      '2-Spalten-Ansicht für Aufgaben (in den Einstellungen wählbar) inkl. sauberem Detail-Modal.',
      'Komplett überarbeitetes Lese-Abteil: automatische Buchcover (Apple Books, Open Library & Google Books), Cover-Regale für Universen & Reihen, 12-Wochen-Heatmap, Lese-Streaks und Top-Bücher-Ranking.',
      'Native Android-App mit Lese-Timer-Widget, Lockscreen-Live-Timer (ohne Musik zu unterbrechen) und kompaktem Aufgaben-Widget.',
    ],
  },
  {
    version: '1.1.6',
    date: '10.10.2026',
    title: 'Einkaufsliste & Stabilität',
    highlights: [
      'Fehler beim Hinzufügen von Artikeln in der Einkaufsliste (grauer Kasten) behoben.',
    ],
  },
];
