# Docelowy design dashboardu - brief projektowy

Data: 2026-05-09

## Cel dokumentu

Ten dokument opisuje docelowy design `PersonalDashboard` jako brief wejsciowy dla narzedzia projektujacego UI, np. Figma AI, Stitch, Lovable, v0 albo innego generatora makiet.

Projekt ma pokazac realna aplikacje do codziennej pracy, nie landing page.

## Jednozdaniowy opis produktu

`PersonalDashboard` to centrum operacyjne dla osobistego Obsidian vaultu: pozwala szybko ogarniac inbox, TODO, projekty, wyszukiwanie wiedzy, research i tworzenie notatek bez koniecznosci pisania dlugich polecen w Codex.

## Glowna intencja designu

Design ma byc spokojny, roboczy i gesty informacyjnie. To narzedzie do codziennego uzywania, a nie efektowna strona marketingowa.

Ma dawac poczucie:

- kontroli nad wieloma watkami
- szybkiego dostepu do kontekstu
- niskiego tarcia przy capture i porzadkowaniu
- pewnosci, gdzie trafi dana informacja w vaultcie
- pracy na realnych plikach Markdown i wikilinkach

## Dla kogo

Jednoosobowy power user korzystajacy z:

- Obsidiana jako second brain
- plikow Markdown w strukturze PARA
- Codexa lub LLM jako silnika do analizy i porzadkowania
- TODO jako prostego pliku operacyjnego
- inboxa jako miejsca szybkich capture
- docelowo widzetu Ubersicht jako stalego pulpitu kontrolnego

## Czego nie projektowac

- Nie projektowac landing page.
- Nie robic hero section.
- Nie tworzyc strony promocyjnej z haslami marketingowymi.
- Nie robic pustego "AI dashboardu" z abstrakcyjnymi wykresami.
- Nie dominowac interfejsu wielkimi kartami.
- Nie projektowac czatu jako jedynego centrum aplikacji.
- Nie robic designu w stylu SaaS marketing: wielkie gradienty, ozdobne blob'y, przesadzone ilustracje.

## Ogolny kierunek wizualny

Styl:

- desktop productivity app
- spokojny, techniczny, czytelny
- blisko Obsidiana, Linear, Raycast, Things, Arc sidebar
- wiecej narzedzia niz strony
- gesty, ale nie przytlaczajacy

Ton:

- roboczy
- precyzyjny
- szybki
- neutralny
- bez ozdobnego copy

Kolory:

- tlo: bardzo jasny neutralny szary albo bardzo ciemny grafit, w zaleznosci od trybu
- panele: lekko odseparowane od tla
- akcent: jeden spokojny kolor funkcyjny, np. niebieski albo zielony
- statusy: czerwony dla ryzyka, zolty dla oczekujacych, zielony dla gotowych
- unikac dominujacego fioletu, bezu, brazow i mocnych gradientow

Typografia:

- font bezszeryfowy systemowy albo nowoczesny UI font
- mala gestosc tekstu, ale wysoka czytelnosc
- naglowki kompaktowe, bez hero-scale
- mono font dla sciezek, komend, tagow, nazw plikow i wikilinkow

## Glowny ekran

Projektowac desktop-first dla 1440 px szerokosci, z responsywnym zachowaniem do 1024 px. Mobile nie jest priorytetem MVP, ale layout nie moze sie rozsypac.

### Rama aplikacji

Układ powinien miec 4 glowne strefy:

1. Lewy sidebar na nawigacje i kontekst vaultu.
2. Gorny command/search bar.
3. Glowny obszar roboczy z inboxem, TODO i projektami.
4. Prawy panel kontekstu z AI, podgladem notatki albo szczegolami wybranego watku.

### Lewy sidebar

Sidebar powinien byc waski, uzytkowy i staly.

Elementy:

- nazwa aplikacji: `PersonalDashboard`
- status vaultu: `Bf-vault`, ostatni sync, liczba plikow w inboxie
- nawigacja:
  - Dashboard
  - Inbox
  - TODO
  - Knowledge
  - Projects
  - Research
  - Calendar
  - Settings
- lista aktywnych projektow:
  - PersonalDashboard
  - PackageLens
  - Stopa
- szybki przycisk capture

Sidebar powinien pokazac, ze aplikacja jest osadzona w lokalnym vaultcie, nie w abstrakcyjnej bazie.

### Gorny pasek

Gorny pasek jest najwazniejszym elementem szybkiej pracy.

Elementy:

- globalne pole `Search or command`
- skrot klawiaturowy pokazany subtelnie, np. `Cmd K`
- selektor trybu:
  - Search
  - Ask
  - Capture
  - Research
- przycisk sync
- status modelu AI
- avatar/profil opcjonalnie

Pole powinno dzialac jak command palette:

- wyszukaj notatke
- zapytaj o wiedze w vaultcie
- dodaj TODO
- utworz notatke
- przetworz link
- znajdz projekt

### Glowny dashboard

Glowny widok powinien pokazywac najwazniejsze operacyjne bloki bez przewijania na ekranie 1440 x 900.

Proponowany układ:

- lewa kolumna glowna, ok. 45 procent szerokosci: Inbox do decyzji
- srodkowa kolumna, ok. 30 procent: TODO i terminy
- prawa kolumna, ok. 25 procent: aktywny projekt i AI context

Alternatywnie:

- duzy blok Inbox
- obok blok TODO
- pod spodem pas: Knowledge search, Research queue, Projects

## Kluczowe moduły

### 1. Inbox do decyzji

To najwazniejszy modul MVP.

Cel:

Pokazac pliki z `97_Inbox/` i pozwolic szybko zdecydowac, co z nimi zrobic.

Widok itemu:

- tytul pliku
- krotki fragment tresci
- typ wykryty przez AI: TODO, link, knowledge, idea, job hunt, unknown
- sugerowane miejsce docelowe
- data utworzenia lub modyfikacji
- liczba slow lub dlugosc materialu
- status: new, suggested, needs review, processed

Akcje itemu:

- Add to TODO
- Create knowledge note
- Move to ideas
- Add to watchlist
- Link to project
- Keep in inbox
- Delete

Interakcja:

- klik itemu otwiera szczegoly w prawym panelu
- AI pokazuje propozycje routingu
- uzytkownik zatwierdza lub zmienia routing
- przed zapisem widac preview zmian w Markdown

### 2. TODO operacyjne

Cel:

Pokazac aktualne zadania z `00_System/TODO.md` bez koniecznosci otwierania pliku.

Sekcje:

- Następne
- Terminy i oczekujące
- Praca i aplikacje
- Projekty i AI
- Do obejrzenia i przeczytania

Widok zadania:

- checkbox
- tresc
- sekcja
- wikilinki
- termin, jesli istnieje
- quick actions

Akcje:

- dodaj zadanie
- odhacz
- przenies do innej sekcji
- powiaz z projektem
- otworz w Obsidianie

### 3. Knowledge search

Cel:

Szybko znalezc informacje w vaultcie i zobaczyc zrodla.

Widok:

- pole pytania
- lista wynikow
- fragmenty dopasowan
- sciezka pliku
- wikilinki
- przycisk `Ask with context`

Odpowiedz AI:

- krotka synteza
- zrodla jako lista notatek
- cytowane fragmenty jako male bloki
- przycisk `Create note from answer`
- przycisk `Add to existing note`

Wazne:

AI nie moze byc czarna skrzynka. Design ma jasno pokazywac, z jakich notatek korzysta.

### 4. Knowledge composer

Cel:

Tworzenie notatek wiedzy z linkow, transkryptow, luznych mysli i materialow z inboxa.

Układ:

- lewa strona: zrodlo
- srodek: proponowana notatka Markdown
- prawa strona: metadata i routing

Pola:

- tytul
- folder docelowy
- temat nadrzedny
- tagi opcjonalne
- link do indeksu
- powiazane notatki

Akcje:

- Save to vault
- Save as draft
- Add wikilinks
- Add to topic index
- Reject

### 5. Research queue

Cel:

Zamieniac tematy do sprawdzenia w uporzadkowane notatki.

Widok itemu research:

- temat
- status: queued, collecting, summarizing, ready to review, saved
- zrodla
- ostatnia aktualizacja
- wynik roboczy

Akcje:

- Start research
- Add source
- Summarize
- Create knowledge note
- Attach to project

### 6. Projects cockpit

Cel:

Pokazac aktywne projekty z `01_Projects/` jako watki pracy.

Dla kazdego projektu:

- nazwa
- status
- ostatnia decyzja
- nastepny krok
- powiazane TODO
- powiazane notatki
- ostatnia sesja z `96_ClaudeMemory`

Dla aktywnego projektu:

- timeline ostatnich zmian
- dokumenty projektowe
- pytania otwarte
- quick action: `Resume project`

### 7. AI panel

Prawy panel powinien zmieniac kontekst w zaleznosci od wybranego elementu.

Tryby:

- Explain selected item
- Suggest routing
- Ask about vault
- Draft note
- Summarize link
- Continue project

Panel nie powinien wygladac jak pelny chat zajmujacy cala aplikacje. To raczej boczny asystent do aktualnego kontekstu.

## Stany interfejsu

Zaprojektowac przynajmniej:

- empty inbox
- inbox with mixed items
- item selected
- AI suggestion ready
- markdown preview before save
- saving
- saved
- conflict detected
- sync error
- no search results
- AI unavailable

## Wzorce interakcji

### Command palette

`Cmd K` powinno byc centralnym sposobem sterowania.

Przyklady komend:

- Add TODO
- Search vault
- Ask vault
- Process inbox
- Create note
- Start research
- Open project
- Open in Obsidian

### Preview before write

Kazda akcja modyfikujaca vault powinna miec preview:

- jaki plik zostanie zmieniony
- jaka tresc zostanie dodana
- czy plik z inboxa zostanie usuniety
- czy zostanie dodany wikilink do indeksu

### Low friction capture

Capture powinien byc mozliwy z kazdego miejsca:

- szybka mysl
- TODO
- link
- pytanie
- temat researchu

Po wpisaniu dashboard sugeruje typ capture.

## Copy i mikrocopy

Copy powinno byc konkretne i robocze.

Dobre przyklady:

- `3 items need routing`
- `Suggested destination: 03_Knowledge/IT`
- `Preview changes`
- `Save to vault`
- `Add to TODO`
- `Create knowledge note`
- `Open in Obsidian`
- `Ask with selected notes`

Unikac:

- "Unlock your productivity"
- "Your AI-powered second brain"
- "Supercharge your workflow"
- ogolnych marketingowych hasel

## Ikony i komponenty

Uzywac ikon funkcyjnych:

- inbox
- search
- check-square
- calendar
- file-text
- folder
- link
- bot
- command
- refresh
- settings
- external-link
- archive
- trash

Komponenty:

- sidebar navigation
- command bar
- segmented control
- compact list item
- checkbox list
- detail panel
- markdown preview
- source chips
- status badges
- confirmation drawer
- toast notifications
- keyboard shortcut hints

Karty powinny miec male radiusy, np. 6-8 px. Nie zagniezdzac kart w kartach.

## Responsywnosc

Desktop:

- pelny layout 3 kolumny + sidebar

Tablet / waski ekran:

- sidebar zwijany
- prawy panel jako drawer
- glowne moduly w 2 kolumnach

Mobile:

- bottom nav albo zwijany sidebar
- jeden modul na ekran
- command bar nadal dostepny

Mobile nie jest glownym scenariuszem, ale powinien byc uzywalny do capture i podgladu TODO.

## Widzet Ubersicht

Widzet Ubersicht ma byc lekkim pulpitem statusowym, nie pelna aplikacja.

Rozmiar:

- kompaktowy panel na desktopie
- czytelny z daleka
- bez przewijania

Zawartosc:

- nazwa vaultu
- liczba itemow w inboxie
- 3 najwazniejsze TODO
- najblizszy termin
- aktywny projekt
- status sync
- szybkie pole capture albo przycisk `Capture`
- przycisk `Open dashboard`

Styl:

- transparentne lub polprzezroczyste tlo zgodne z macOS
- bardzo czytelny tekst
- minimum dekoracji
- statusy kolorami, ale oszczednie

Ubersicht powinien byc jak pulpit kontrolny: stale widoczny, ale nie rozpraszajacy.

## Ekrany do zaprojektowania

Minimum:

1. Dashboard home
2. Inbox item review
3. Knowledge search results
4. Knowledge composer
5. Project cockpit
6. Command palette
7. Ubersicht widget

Opcjonalnie:

1. Research queue
2. Settings
3. Conflict resolution
4. Calendar view

## Dane przykładowe do makiety

Vault:

- `Bf-vault`
- `97_Inbox`: 4 items
- `00_System/TODO.md`: 11 active tasks
- `01_Projects`: PackageLens, PersonalDashboard, Stopa
- `03_Knowledge`: IT, Fotografia, Zdrowie, YT_summaries

Przykladowe inbox items:

- `32 Tricks to Level Up Claude Code in 16 Mins.md`
- `Rozmowa HAYS.md`
- `5 Agent Skills do jakościowego programowania z AI - Claude Code LIVE DEMO.md`
- `Bez nazwy 1.md`

Przykladowe TODO:

- zakup okularow do zacmienia
- wypozyczenie kuchenki
- sprawdzic context assisted engineering
- instalacja skilli w Cowork

Przykladowe projekty:

- PersonalDashboard
- PackageLens
- Stopa

## Gotowy prompt dla narzedzia projektujacego

Stworz high-fidelity design desktopowej aplikacji webowej `PersonalDashboard`.

To nie jest landing page. To robocze centrum operacyjne dla osobistego Obsidian vaultu. Aplikacja pomaga szybko obslugiwac inbox, TODO, projekty, wyszukiwanie wiedzy, research i tworzenie notatek Markdown. Design ma byc spokojny, techniczny, gesty informacyjnie i wygodny do codziennego uzywania.

Zaprojektuj desktop-first UI dla 1440 px szerokosci. Uzyj ukladu z lewym sidebarem, gornym command/search barem, glownym obszarem roboczym i prawym panelem kontekstu AI. Nie tworz hero section, marketingowych sloganow ani dekoracyjnych gradientow.

Glowny ekran ma zawierac:

- inbox do decyzji z plikami z `97_Inbox`
- TODO z `00_System/TODO.md`
- search po vaultcie
- aktywny projekt
- prawy panel AI z sugestiami routingu i preview zmian

Najwazniejszy flow:

Uzytkownik wybiera item z inboxa, widzi sugestie AI, wybiera akcje typu `Add to TODO`, `Create knowledge note`, `Move to ideas` albo `Add to watchlist`, oglada preview zmian w Markdown i zatwierdza zapis do vaultu.

Uwzglednij:

- command palette pod `Cmd K`
- markdown preview before save
- wikilinki Obsidian
- status sync vaultu
- source chips przy odpowiedziach AI
- kompaktowe listy i panele
- stany: empty inbox, item selected, AI suggestion ready, saving, saved, sync error

Dodatkowo zaprojektuj kompaktowy widzet Ubersicht: nazwa vaultu, liczba itemow w inboxie, 3 najwazniejsze TODO, najblizszy termin, aktywny projekt, status sync, przycisk capture i przycisk open dashboard.

Styl wizualny:

- spokojny productivity app
- inspiracje: Obsidian, Linear, Raycast, Things, Arc sidebar
- neutralne tlo
- male radiusy 6-8 px
- czytelna typografia
- mono font dla sciezek plikow i wikilinkow
- jeden oszczedny kolor akcentu
- zero marketingowego tonu

Wynik powinien wygladac jak realne narzedzie do pracy z osobistym knowledge base, nie jak generyczny AI SaaS dashboard.
