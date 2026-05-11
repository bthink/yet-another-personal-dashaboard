# Potencjalne funkcje - kolejne iteracje

Data: 2026-05-09

## Cel

Lista potencjalnych funkcji dla kolejnych iteracji `PersonalDashboard`. To backlog pomyslow, nie zakres MVP.

Priorytetem produktu pozostaje lokalna praca z Obsidian vaultem: inbox, TODO, search, routing, preview zmian i bezpieczny zapis.

## Najbardziej wartosciowe funkcje

### Daily review

Jeden widok startowy pokazujacy:

- inbox
- najblizsze TODO
- terminy
- aktywne projekty
- rzeczy oczekujace
- szybkie capture

Cel: szybkie wejscie w dzien bez przeszukiwania wielu plikow.

### Command capture

Szybkie wpisanie dowolnej rzeczy z kazdego miejsca aplikacji.

Dashboard powinien rozpoznawac typ capture:

- TODO
- idea
- knowledge note
- research topic
- link do obejrzenia
- wpis do projektu

### Inbox triage mode

Tryb przegladania itemow z inboxa jeden po drugim.

Flow:

1. Pokaz item.
2. Pokaz sugestie routingu.
3. Uzytkownik zatwierdza albo poprawia.
4. Dashboard pokazuje preview zmian.
5. Zapis do vaultu.
6. Nastepny item.

### Preview diff przed zapisem

Kazda akcja modyfikujaca vault powinna pokazac dokladny diff:

- jaki plik zostanie zmieniony
- co zostanie dopisane
- co zostanie usuniete z inboxa
- czy zostanie dodany wikilink
- czy zostanie zmieniony indeks tematu

### Open in Obsidian

Kazdy plik, TODO, wikilink i wynik search powinien miec akcje otwarcia w Obsidianie.

### Backlinks i related notes

Przy tworzeniu albo edycji notatki dashboard powinien pokazac:

- podobne notatki
- potencjalne backlinks
- istniejace wikilinki
- tematy, do ktorych notatka moze nalezec

### Duplicate detector

Dashboard powinien wykrywac podobne notatki przed utworzeniem nowej.

Przyklad:

- "Masz juz podobna notatke w `03_Knowledge/IT`."
- "Ten material wyglada jak rozwiniecie istniejacej notatki, a nie nowy plik."

### Index maintainer

Przy tworzeniu notatki dashboard powinien proponowac dopisanie wikilinku do wlasciwego indeksu tematu, np. `03_Knowledge/IT/IT.md`.

## Funkcje dla projektow

### Project resume

Widok wznawiania pracy nad projektem:

- ostatnia sesja
- ostatnie decyzje
- TODO
- otwarte pytania
- nastepny krok
- powiazane notatki

Cel: ograniczyc potrzebe pytania "gdzie skonczylismy?".

### Project inbox

Widok rzeczy potencjalnie powiazanych z projektem:

- itemy z `97_Inbox/`
- TODO
- notatki knowledge
- session memory
- linki do obejrzenia

Dashboard moze sugerowac, ze dany item pasuje do projektu.

### Decision log

Szybkie zapisywanie decyzji projektowych:

- data
- decyzja
- uzasadnienie
- alternatywy
- linki do notatek

### Next action generator

Na podstawie kontekstu projektu dashboard proponuje 1-3 konkretne nastepne kroki.

### PRD i document generator

Generowanie dokumentow projektowych z notatek:

- PRD
- brief designu
- specyfikacja techniczna
- checklista MVP
- release plan

## Funkcje dla knowledge base

### Knowledge gap finder

Wykrywanie tematow, ktore pojawiaja sie w wielu miejscach, ale nie maja dobrej notatki indeksowej albo glownej notatki tematu.

### Topic map

Mapa klastrow wiedzy:

- IT
- Fotografia
- Zdrowie
- YT_summaries
- Research
- inne tematy

Mapa powinna pomagac zobaczyc, gdzie wiedza jest rozproszona.

### Note quality check

Sprawdzanie jakosci notatki:

- czy ma dobry tytul
- czy ma zrodlo
- czy ma wikilinki
- czy jest w dobrym folderze
- czy jest dodana do indeksu tematu
- czy nie dubluje innej notatki

### Refactor notes

Akcje porzadkujace:

- scal podobne notatki
- rozbij zbyt dluga notatke
- przenies notatke do wlasciwego folderu
- dodaj brakujace linki
- popraw tytul

### Source queue

Kolejka materialow do przetworzenia:

- linki
- filmy
- artykuly
- transkrypty
- posty LinkedIn

Akcje:

- przetworz do notatki
- dodaj do watchlisty
- powiaz z projektem
- odrzuc

## Higiena vaultu

### Orphan notes checker

Wykrywanie sierot, czyli notatek bez sensownych polaczen z reszta vaultu.

Dashboard powinien pokazywac:

- notatki bez inbound links
- notatki bez outbound links
- notatki nieobecne w indeksach tematow
- notatki lezace luzem w nieoczekiwanych folderach

Mozliwe akcje:

- dodaj do indeksu
- dodaj wikilinki
- przenies do odpowiedniego folderu
- oznacz jako celowo odizolowana
- przenies do archiwum

### Deadlink checker

Wykrywanie martwych wikilinkow i linkow do nieistniejacych notatek.

Dashboard powinien pokazywac:

- plik z martwym linkiem
- nazwe nieistniejacej notatki
- liczbe wystapien
- sugerowany istniejacy plik, jesli nazwa jest podobna

Mozliwe akcje:

- popraw link na istniejaca notatke
- utworz brakujaca notatke
- usun martwy link
- zamien link na zwykly tekst

### Link health dashboard

Widok stanu polaczen w vaultcie:

- liczba deadlinkow
- liczba orphan notes
- notatki bez indeksu
- najczesciej linkowane notatki
- tematy z najwiekszym chaosem

### Vault cleanup suggestions

Lista sugerowanych porzadkow:

- puste pliki
- duplikaty
- notatki bez folderu tematycznego
- stare pliki w inboxie
- rozjechane nazwy indeksow
- niespojne nazwy tematow

## Funkcje dla TODO i zycia operacyjnego

### Waiting list

Widok rzeczy oczekujacych:

- umowy
- kody
- terminy
- odpowiedzi od ludzi
- rzeczy z deadline

### Deadline monitor

Dashboard wyciaga daty z TODO i pokazuje, co sie zbliza.

### Errand mode

Lista krotkich spraw do zalatwienia:

- kupic
- sprawdzic
- zadzwonic
- zarezerwowac
- wyslac

### Done review

Podsumowanie rzeczy zrobionych w ostatnim tygodniu albo miesiacu.

### Stale task detector

Wykrywanie zadan, ktore wisza dlugo bez ruchu.

Mozliwe akcje:

- zostaw
- przenies
- usun
- rozbij na mniejsze
- zaplanuj na konkretny termin

## Integracje na pozniej

### Raycast command

Szybki capture i otwieranie dashboardu z Raycast.

### Menu bar mini app

Minimalna aplikacja w menu bar:

- szybkie TODO
- szybki capture
- status inboxa
- open dashboard

### Ubersicht status widget

Staly pulpit statusowy:

- liczba itemow w inboxie
- 3 najwazniejsze TODO
- aktywny projekt
- najblizszy termin
- status sync
- capture albo launcher

### Calendar overlay

Polaczenie terminow z:

- Google Calendar
- dat z TODO
- deadline z notatek projektowych

### Browser clipper endpoint

Endpoint albo lokalna akcja do wrzucania linkow z przegladarki bezposrednio do:

- inboxa
- watchlisty
- knowledge composer
- research queue

### LLM cost/status panel

Panel statusu modeli i kosztow:

- aktualny provider
- model
- szacowany koszt
- usage
- ostatnie bledy API

To jest przydatne, ale nie powinno byc core MVP.

## Zasada produktowa

Dashboard powinien byc operacyjnym edytorem systemu wiedzy, nie tylko chatem z notatkami.

Chat jest jednym z trybow. Glowna wartosc to:

- decyzje
- routing
- porzadkowanie
- preview zmian
- bezpieczny zapis do vaultu
- higiena linkow i struktury wiedzy
