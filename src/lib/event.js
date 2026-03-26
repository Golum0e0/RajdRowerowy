export const ORGANIZER_INFO = {
  name: "Stowarzyszenie Zielony Szlak",
  email: "biuro@zielonyszlak2026.pl",
  phone: "+48 600 700 800",
  website: "www.zielonyszlak2026.pl"
};

export const DEFAULT_EVENT = {
  id: "zielony-szlak-2026",
  shortName: "RR",
  name: "Rajd Rowerowy Zielony Szlak 2026",
  date: "2026-06-14",
  distanceKm: 42,
  city: "Olsztyn",
  location: "Start i biuro zawodow: Park Centralny, Olsztyn",
  routeNote: "Trzy dystanse prowadzone przez szutry, las i odcinki miejskie.",
  createdAt: "2026-03-01T09:00:00.000Z"
};

export function formatEventDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date || "";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsed);
}

export function formatEventHeroLabel(event) {
  if (!event) {
    return "";
  }

  const dateLabel = formatEventDate(event.date);
  return [dateLabel, event.city].filter(Boolean).join(" • ");
}

export function formatEventDistance(distanceKm) {
  if (!distanceKm && distanceKm !== 0) {
    return "";
  }

  return `${distanceKm} km`;
}

export const ORGANIZER_TABS = [
  {
    id: "regulations",
    label: "Regulamin",
    title: "Regulamin wydarzenia",
    paragraphs: [
      "Kazdy uczestnik bierze udzial w rajdzie dobrowolnie i akceptuje trase, limity czasowe oraz zasady bezpieczenstwa organizatora.",
      "Organizator zastrzega sobie prawo do zmiany przebiegu trasy lub harmonogramu z przyczyn pogodowych, technicznych lub bezpieczenstwa."
    ],
    bullets: [
      "Odbior pakietu startowego odbywa sie w dniu wydarzenia po potwierdzeniu tozsamosci.",
      "Kazdy uczestnik powinien posiadac sprawny rower oraz kask ochronny.",
      "Nieobecnosc na starcie nie uprawnia do roszczen wobec organizatora."
    ]
  },
  {
    id: "privacy",
    label: "Polityka prywatnosci",
    title: "Polityka prywatnosci",
    paragraphs: [
      "Dane uczestnikow sa przetwarzane wylacznie na potrzeby organizacji rajdu, komunikacji przedstartowej i przygotowania list startowych.",
      "Dostep do danych ma jedynie upowazniony administrator panelu oraz osoby obslugujace wydarzenie."
    ],
    bullets: [
      "Dane nie sa udostepniane publicznie w otwartej czesci aplikacji.",
      "Uczestnik moze poprosic o korekte lub usuniecie danych kontaktowych przed startem wydarzenia.",
      "Eksport list uczestnikow jest ograniczony do panelu administracyjnego."
    ]
  },
  {
    id: "rodo",
    label: "RODO",
    title: "Zgody i przetwarzanie danych",
    paragraphs: [
      "Administratorem danych jest Stowarzyszenie Zielony Szlak. Podanie danych jest dobrowolne, lecz niezbedne do obslugi zapisu.",
      "Dane sa przechowywane tak dlugo, jak jest to konieczne do organizacji wydarzenia, rozliczenia oraz obslugi ewentualnych reklamacji."
    ],
    bullets: [
      "Zakres danych: imie, nazwisko, data urodzenia, numer telefonu, wybrany dystans i data zapisu.",
      "Podstawa przetwarzania: zgoda uczestnika oraz uzasadniony interes organizatora.",
      `W sprawach dotyczacych danych mozna kontaktowac sie mailowo pod adresem ${ORGANIZER_INFO.email}.`
    ]
  }
];
