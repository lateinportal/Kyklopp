# Roma-A-Wörterbuch: Quellen und Nachbau

Die Wörterbucheinträge und deutschen Bedeutungen stammen ausschließlich aus der vom Nutzer bereitgestellten Roma-A-Vokabeltabelle, Datenstand 15. Oktober 2026. Die bestehenden Karten-IDs werden unverändert verwendet. Externe Lemmata werden nicht als zusätzliche Wörterbuchartikel importiert.

Die morphologischen Modelle und Stammangaben stammen aus Collatinus / CLTK:

- https://github.com/cltk/lat_models_cltk/tree/master/lemmata/collatinus
- Daten: https://raw.githubusercontent.com/cltk/lat_models_cltk/master/lemmata/collatinus/collected.json
- Beschreibung: https://raw.githubusercontent.com/cltk/lat_models_cltk/master/lemmata/collatinus/README.md
- Ursprüngliches Projekt: https://github.com/biblissima/collatinus

Die Collatinus-Daten wurden von Philippe Verkerk und Yves Ouvrard zusammengestellt und von Thibault Clérice für CLTK konvertiert. Die Daten und die daraus abgeleiteten Wörterbuchmodule werden unter GNU GPL Version 3 oder später bereitgestellt; der vollständige Lizenztext liegt in COPYING-GPL-3.0.txt. Der mitgelieferte Quelltext ermöglicht den Nachbau der verwendeten Formenbasis.

## Änderungen für Roma A

`build-dictionary.mjs` erzeugt die auf Roma A beschränkten Formendaten. Gegenüber dem alten CLTK-Decliner werden explizite unregelmäßige Stämme anstelle regulärer Ersatzstämme verwendet. Die Datei dokumentiert zusätzlich fehlende Schulvokabeln, assimilierte Schreibungen, Ausdrücke, pluralische Einträge, defektive Verben, klassische deponentische Futurimperative sowie zusammengesetzte Perfektformen.

`dist/dictionary.js` erstellt den Suchindex, bestimmt Suchformen und formatiert die grammatischen Angaben. Lange und kurze Vokale werden bei der Suche nicht unterschieden; i/j und u/v werden zusammengeführt. Bei mehrdeutigen Formen werden die hinterlegten Bestimmungen gemeinsam angezeigt. Wortlaut und Lernstand der Trainingskarten werden nicht geändert.

## Nachbau

Benötigt wird Node.js (getestet mit Version 24). Im Quellverzeichnis ausführen:

    node build-dictionary.mjs
    node test-dictionary.mjs

Der Generator benötigt nur die enthaltene `collatinus.json` und `dist/data.js`; keine Netzwerkverbindung und keine zusätzlichen Pakete. Das erzeugte `dist/morphology-data.js` und `dist/dictionary.js` werden mit dem Trainer ausgeliefert. `package-local.mjs` bündelt den Trainer zu einer HTML-Datei (Zielpfad entsprechend dem Arbeitsverzeichnis einstellen).

Die automatischen Prüfungen kontrollieren die Beschränkung auf Roma-A-Einträge, gültige Formencodes und repräsentative regelmäßige sowie unregelmäßige Formen. Sie ersetzen keine vollständige philologische Durchsicht sämtlicher antiker Nebenformen.

## Google Sheets

`Roma-A-Woerterbuchformen.xlsx` ist eine separat importierbare Formenergänzung zur vorhandenen Tabelle. Die Wort-IDs verknüpfen jede Form mit dem bestehenden Trainer-Eintrag. Ein Wort kann mehrere Zeilen besitzen; pro Zeile werden bis zu zwölf Suchformen aufgeführt. Die Online-Tabelle wird durch die lokale Datei nicht automatisch verändert oder synchronisiert.
