# Dashboard jako centrum operacyjne vaultu

Data: 2026-05-08

## Teza

`PersonalDashboard` powinien byc centrum operacyjnym dla Obsidian vaultu, a nie tylko klasycznym dashboardem z widzetami.

Najwieksza wartosc nie lezy w pokazaniu TODO, kalendarza i notatek obok siebie. Wartosc jest w skroceniu sciezki:

`mam mysl / link / pytanie / zadanie` -> `system pomaga znalezc kontekst` -> `wybieram akcje` -> `vault zostaje poprawnie zaktualizowany`

To powinno byc cos pomiedzy Obsidianem, inboxem, wyszukiwarka/RAG i agentem porzadkujacym.

## Problem

Codex jest dobry jako silnik do analizy, klasyfikacji, pisania, szukania i porzadkowania. Dlugofalowo nie jest jednak optymalnym codziennym interfejsem do pracy z vaultem.

Codzienna obsluga powinna byc szybsza:

- klik
- skrot
- formularz
- command palette
- podglad zmian przed zapisem
- zatwierdzanie proponowanych akcji

## Glowne obszary dashboardu

### Inbox do decyzji

Widok plikow z `97_Inbox/` z szybkimi akcjami:

- do `00_System/TODO.md`
- do `03_Knowledge`
- do `04_Ideas`
- do `00_System/Do obejrzenia i przeczytania.md`
- zostaw w inboxie
- usun

AI moze sugerowac routing, np. "to wyglada jak notatka do `03_Knowledge/IT`" albo "to jest zadanie do `00_System/TODO.md`".

### TODO operacyjne

Widok aktualnego `00_System/TODO.md`:

- najblizsze zadania
- terminy i oczekujace
- projekty i AI
- szybkie dopisywanie
- odhaczanie
- przenoszenie do zrobionych

### Search po vaultcie

Szybkie wyszukiwanie tekstowe po notatkach, a pozniej RAG/chat nad vaultem.

Wynik powinien pokazywac zrodla i wikilinki, nie tylko odpowiedz LLM.

### Knowledge composer

Miejsce do tworzenia notatek wiedzy z:

- linku
- transkryptu
- luznej mysli
- materialu z inboxa
- researchu

Dashboard powinien proponowac folder, tytul, linki do indeksu i tresc notatki. Uzytkownik zatwierdza, a zapis trafia do Markdowna w Obsidianie.

### Research queue

Kolejka tematow do zbadania:

- wpisanie tematu
- zebranie materialow
- streszczenie
- utworzenie notatki roboczej
- decyzja: `03_Knowledge`, `04_Ideas`, `01_Projects` albo odrzucenie

### Projektowy cockpit

Widok aktywnych projektow z `01_Projects/`:

- ostatnie decyzje
- nastepny krok
- powiazane TODO
- powiazane notatki
- historia sesji z `96_ClaudeMemory`

Ten widok powinien ograniczac potrzebe pytania Codexa: "gdzie skonczylismy?".

## Ubersicht

Ubersicht powinien byc stalym pulpitem statusowym i launcherem akcji, nie pelna aplikacja.

Na pulpicie warto pokazac:

- liczbe rzeczy w inboxie
- 3 najwazniejsze TODO
- dzisiejsze terminy
- aktywny projekt
- pole szybkiego capture
- skrot do pelnego dashboardu

Pelna praca powinna odbywac sie w web appce, a Ubersicht ma byc lekkim centrum kontrolnym.

## MVP

Pierwsza wersja powinna byc lokalna i praktyczna:

- czytanie vaultu z plikow Markdown
- indeks tekstowy
- lista inboxa
- parser TODO
- szybkie akcje zapisu do vaultu
- prosty chat/search nad notatkami

Dopiero pozniej:

- pgvector
- pelny RAG
- Google Calendar
- token usage
- multi-model prompting
- research agent

## Otwarte pytania

- Czy pierwsza wersja ma operowac tylko na lokalnych plikach Markdown, czy od razu uzywac Supabase/pgvector?
- Jakie akcje dashboard moze wykonac automatycznie, a ktore wymagaja zatwierdzenia?
- Czy Ubersicht ma tylko wyswietlac status, czy rowniez przyjmowac szybki capture?
- Jak wyglada minimalny kontrakt operacji na vaultcie: dopisz TODO, utworz knowledge note, przenies do ideas, dopisz link do indeksu?
