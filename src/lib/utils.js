export const DISTANCE_OPTIONS = [
  "Rodzinny 15 km",
  "Sportowy 40 km",
  "Maraton 75 km"
];

export function createEmptyParticipant() {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    distance: DISTANCE_OPTIONS[0],
    consent: false
  };
}

export function phoneDigits(value) {
  return value.replace(/\D/g, "").slice(0, 9);
}

export function maskPhoneInput(value) {
  const digits = phoneDigits(value);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function normalizePhone(phone) {
  return phoneDigits(phone);
}

export function formatPhone(phone) {
  const digits = phoneDigits(phone);
  if (digits.length <= 3) {
    return digits;
  }

  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`.trim();
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function isAdult(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 18;
  }

  return age >= 18;
}

export function validateParticipant(form) {
  const errors = {};
  const namePattern = /^[\p{L}\s'-]{2,}$/u;
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const digits = normalizePhone(form.phone);

  if (!firstName) {
    errors.firstName = "Podaj imie.";
  } else if (!namePattern.test(firstName)) {
    errors.firstName = "Imie powinno miec co najmniej 2 litery.";
  }

  if (!lastName) {
    errors.lastName = "Podaj nazwisko.";
  } else if (!namePattern.test(lastName)) {
    errors.lastName = "Nazwisko powinno miec co najmniej 2 litery.";
  }

  if (!form.birthDate) {
    errors.birthDate = "Podaj date urodzenia.";
  } else {
    const birthDate = new Date(form.birthDate);
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 100);

    if (Number.isNaN(birthDate.getTime())) {
      errors.birthDate = "Niepoprawna data urodzenia.";
    } else if (birthDate > now) {
      errors.birthDate = "Data urodzenia nie moze byc z przyszlosci.";
    } else if (birthDate < minDate) {
      errors.birthDate = "Sprawdz date urodzenia.";
    }
  }

  if (!digits) {
    errors.phone = "Podaj numer telefonu.";
  } else if (digits.length !== 9) {
    errors.phone = "Numer telefonu musi miec 9 cyfr.";
  }

  if (!form.consent) {
    errors.consent = "Musisz zaakceptowac zgode na przetwarzanie danych.";
  }

  return errors;
}
