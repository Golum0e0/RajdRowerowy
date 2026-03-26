# Rajd Rowerowy

Instalowalna aplikacja PWA w React do obslugi zapisow na rajd rowerowy. Projekt zawiera profesjonalny, responsywny interfejs, formularz uczestnika, lokalna baze danych IndexedDB, uproszczony panel administracyjny, eksport CSV/PDF oraz widok gotowy do druku.

## Funkcje

- responsywny interfejs dla telefonow, tabletow i komputerow
- instalacja jako aplikacja PWA na Windows oraz Android z poziomu przegladarki
- lokalna baza danych IndexedDB przechowujaca uczestnikow na urzadzeniu organizatora
- panel administracyjny zabezpieczony haslem i wygasaniem sesji
- dodawanie i usuwanie zawodnikow, takze recznie z panelu administratora
- eksport listy uczestnikow do CSV i PDF
- drukowanie listy uczestnikow z czytelnym ukladem tabelarycznym
- mechanizmy ochrony danych: zgoda RODO, ograniczenie dostepu do listy, lokalne przechowywanie danych
- workflow pod GitHub Pages oraz gotowosc do publikacji na GitHub

## Technologie

- React 18
- Vite
- vite-plugin-pwa
- IndexedDB przez `idb`
- `jspdf` i `jspdf-autotable`

## Uruchomienie lokalne

```bash
npm install
npm start
```

## Build produkcyjny

```bash
npm run build
```

Gotowy build pojawi sie w folderze `dist`.

## Instalacja na Windows i Android

1. Uruchom wdrozona aplikacje HTTPS lub lokalny build.
2. W przegladarce Edge albo Chrome wybierz opcje instalacji aplikacji.
3. Na Androidzie pojawi sie przycisk `Dodaj do ekranu glownego`.
4. Na Windows aplikacje mozna zainstalowac jako PWA z menu przegladarki.

## Publikacja na GitHub

1. Zainicjalizuj repozytorium:

```bash
git init
git add .
git commit -m "Initial commit - Rajd Rowerowy"
```

2. Utworz nowe repozytorium na GitHub i podlacz zdalny adres:

```bash
git remote add origin https://github.com/TWOJ_LOGIN/rajd-rowerowy.git
git branch -M main
git push -u origin main
```

3. Do hostowania statycznego mozna uzyc GitHub Pages albo Netlify.

## Struktura

- `src/App.jsx` - glowny interfejs aplikacji
- `src/lib/db.js` - obsluga lokalnej bazy IndexedDB
- `src/lib/auth.js` - haslo i sesja administratora
- `src/lib/exports.js` - eksport CSV i PDF

## Paczka ZIP

Po zbudowaniu projektu mozna przygotowac archiwum:

```powershell
Compress-Archive -Path dist, src, public, package.json, vite.config.js, index.html, README.md -DestinationPath rajd-rowerowy-package.zip -Force
```

## Wymagania, ktore projekt spelnia

- formularz zapisow: imie, nazwisko, data urodzenia, numer telefonu
- dopisywanie i usuwanie zawodnikow
- panel administracyjny
- lokalna baza danych
- mechanizmy ochrony danych uczestnikow
- eksport CSV i PDF
- drukowanie listy uczestnikow
- czytelny, profesjonalny i ostylowany interfejs
- responsywnosc oraz menu mobilne
- instalacja na Androidzie i Windowsie jako PWA
- gotowosc do publikacji na GitHub
