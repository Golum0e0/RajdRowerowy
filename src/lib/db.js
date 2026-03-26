import { openDB } from "idb";

const DB_NAME = "rajd-rowerowy-db";
const DB_VERSION = 4;
const PARTICIPANTS_STORE = "participants";
const EVENTS_STORE = "events";
const ACTIVE_EVENT_KEY = "rajd-rowerowy-active-event-id";
const SEED_VERSION_KEY = "rajd-rowerowy-seed-version";
const CURRENT_SEED_VERSION = "starter-pack-2026-03-26-v2";

const SEEDED_EVENTS = [
  {
    id: "wisla-classic-2026",
    shortName: "WC",
    name: "Wisla Classic",
    date: "2026-04-18",
    distanceKm: 18,
    city: "Krakow",
    location: "Bulwary Wislane, start przy Wawelu",
    routeNote: "Widokowa trasa rekreacyjna prowadzaca wzdluz Wisly i przez zielone odcinki miasta.",
    createdAt: "2026-03-26T08:00:00.000Z"
  },
  {
    id: "jurassic-ride-2026",
    shortName: "JR",
    name: "Jurassic Ride",
    date: "2026-05-09",
    distanceKm: 46,
    city: "Ogrodzieniec",
    location: "Zamek Ogrodzieniec, biuro zawodow przy parkingu glownym",
    routeNote: "Szybszy rajd terenowy przez wapienne podjazdy, las i otwarte odcinki Jury.",
    createdAt: "2026-03-26T08:10:00.000Z"
  }
];

const SEEDED_PARTICIPANTS = [
  {
    id: "p-anna-nowak",
    eventId: "wisla-classic-2026",
    firstName: "Anna",
    lastName: "Nowak",
    birthDate: "1994-05-12",
    phone: "600701101",
    distance: "18 km",
    consent: true,
    createdAt: "2026-03-26T09:00:00.000Z"
  },
  {
    id: "p-marek-krol",
    eventId: "wisla-classic-2026",
    firstName: "Marek",
    lastName: "Krol",
    birthDate: "1988-09-21",
    phone: "600701102",
    distance: "18 km",
    consent: true,
    createdAt: "2026-03-26T09:02:00.000Z"
  },
  {
    id: "p-julia-wisniewska",
    eventId: "wisla-classic-2026",
    firstName: "Julia",
    lastName: "Wisniewska",
    birthDate: "2001-02-03",
    phone: "600701103",
    distance: "18 km",
    consent: true,
    createdAt: "2026-03-26T09:04:00.000Z"
  },
  {
    id: "p-piotr-zielinski",
    eventId: "wisla-classic-2026",
    firstName: "Piotr",
    lastName: "Zielinski",
    birthDate: "1997-11-15",
    phone: "600701104",
    distance: "18 km",
    consent: true,
    createdAt: "2026-03-26T09:06:00.000Z"
  },
  {
    id: "p-karolina-mazur",
    eventId: "wisla-classic-2026",
    firstName: "Karolina",
    lastName: "Mazur",
    birthDate: "1992-07-08",
    phone: "600701105",
    distance: "18 km",
    consent: true,
    createdAt: "2026-03-26T09:08:00.000Z"
  },
  {
    id: "p-tomasz-jablonski",
    eventId: "jurassic-ride-2026",
    firstName: "Tomasz",
    lastName: "Jablonski",
    birthDate: "1985-03-29",
    phone: "600701106",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:10:00.000Z"
  },
  {
    id: "p-michal-adamczyk",
    eventId: "jurassic-ride-2026",
    firstName: "Michal",
    lastName: "Adamczyk",
    birthDate: "1990-12-17",
    phone: "600701107",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:12:00.000Z"
  },
  {
    id: "p-zuzanna-krawiec",
    eventId: "jurassic-ride-2026",
    firstName: "Zuzanna",
    lastName: "Krawiec",
    birthDate: "1999-08-27",
    phone: "600701108",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:14:00.000Z"
  },
  {
    id: "p-adrian-pawlak",
    eventId: "jurassic-ride-2026",
    firstName: "Adrian",
    lastName: "Pawlak",
    birthDate: "1987-01-10",
    phone: "600701109",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:16:00.000Z"
  },
  {
    id: "p-monika-sikora",
    eventId: "jurassic-ride-2026",
    firstName: "Monika",
    lastName: "Sikora",
    birthDate: "1995-04-05",
    phone: "600701110",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:18:00.000Z"
  },
  {
    id: "p-dawid-wojcik",
    eventId: "jurassic-ride-2026",
    firstName: "Dawid",
    lastName: "Wojcik",
    birthDate: "1993-06-14",
    phone: "600701111",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:20:00.000Z"
  },
  {
    id: "p-paulina-baran",
    eventId: "jurassic-ride-2026",
    firstName: "Paulina",
    lastName: "Baran",
    birthDate: "1998-10-01",
    phone: "600701112",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:22:00.000Z"
  },
  {
    id: "p-sebastian-czarnecki",
    eventId: "jurassic-ride-2026",
    firstName: "Sebastian",
    lastName: "Czarnecki",
    birthDate: "1986-01-24",
    phone: "600701113",
    distance: "46 km",
    consent: true,
    createdAt: "2026-03-26T09:24:00.000Z"
  }
];

let seedPromise = null;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, _newVersion, transaction) {
    if (!db.objectStoreNames.contains(PARTICIPANTS_STORE)) {
      const store = db.createObjectStore(PARTICIPANTS_STORE, {
        keyPath: "id"
      });
      store.createIndex("createdAt", "createdAt");
      store.createIndex("lastName", "lastName");
    }

    if (!db.objectStoreNames.contains(EVENTS_STORE)) {
      const store = db.createObjectStore(EVENTS_STORE, {
        keyPath: "id"
      });
      store.createIndex("createdAt", "createdAt");
      store.createIndex("date", "date");
    }

    if (oldVersion < 4) {
      if (db.objectStoreNames.contains(PARTICIPANTS_STORE)) {
        transaction.objectStore(PARTICIPANTS_STORE).clear();
      }

      if (db.objectStoreNames.contains(EVENTS_STORE)) {
        transaction.objectStore(EVENTS_STORE).clear();
      }
    }
  }
});

function sortEvents(events) {
  return [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getSeedVersion() {
  return localStorage.getItem(SEED_VERSION_KEY) || "";
}

function setSeedVersion(value) {
  localStorage.setItem(SEED_VERSION_KEY, value);
}

export function getActiveEventId() {
  return localStorage.getItem(ACTIVE_EVENT_KEY) || "";
}

export function setActiveEventId(eventId) {
  if (eventId) {
    localStorage.setItem(ACTIVE_EVENT_KEY, eventId);
    return;
  }

  localStorage.removeItem(ACTIVE_EVENT_KEY);
}

async function seedStarterDatabase(db) {
  const tx = db.transaction([EVENTS_STORE, PARTICIPANTS_STORE], "readwrite");
  const eventsStore = tx.objectStore(EVENTS_STORE);
  const participantsStore = tx.objectStore(PARTICIPANTS_STORE);

  await eventsStore.clear();
  await participantsStore.clear();

  for (const event of SEEDED_EVENTS) {
    await eventsStore.put(event);
  }

  for (const participant of SEEDED_PARTICIPANTS) {
    await participantsStore.put(participant);
  }

  await tx.done;
  setActiveEventId(sortEvents(SEEDED_EVENTS)[0]?.id || "");
  setSeedVersion(CURRENT_SEED_VERSION);
}

async function ensureSeedData(db) {
  if (getSeedVersion() === CURRENT_SEED_VERSION) {
    return;
  }

  if (!seedPromise) {
    seedPromise = seedStarterDatabase(db).finally(() => {
      seedPromise = null;
    });
  }

  await seedPromise;
}

async function ensureDatabaseState(db) {
  await ensureSeedData(db);
  const events = await db.getAll(EVENTS_STORE);
  const validEventIds = new Set(events.map((event) => event.id));
  const participants = await db.getAll(PARTICIPANTS_STORE);
  const invalidParticipants = participants.filter(
    (participant) => !participant.eventId || !validEventIds.has(participant.eventId)
  );

  if (invalidParticipants.length) {
    const tx = db.transaction(PARTICIPANTS_STORE, "readwrite");
    for (const participant of invalidParticipants) {
      await tx.store.delete(participant.id);
    }
    await tx.done;
  }

  const activeEventId = getActiveEventId();
  if (!activeEventId || !validEventIds.has(activeEventId)) {
    setActiveEventId(sortEvents(events)[0]?.id || "");
  }
}

export async function getParticipants() {
  const db = await dbPromise;
  await ensureDatabaseState(db);
  const records = await db.getAll(PARTICIPANTS_STORE);
  return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function saveParticipant(participant) {
  const db = await dbPromise;
  await ensureDatabaseState(db);
  await db.put(PARTICIPANTS_STORE, participant);
  return participant;
}

export async function deleteParticipant(id) {
  const db = await dbPromise;
  await db.delete(PARTICIPANTS_STORE, id);
}

export async function deleteEvent(eventId) {
  const db = await dbPromise;
  await ensureDatabaseState(db);

  const tx = db.transaction([EVENTS_STORE, PARTICIPANTS_STORE], "readwrite");
  const eventsStore = tx.objectStore(EVENTS_STORE);
  const participantsStore = tx.objectStore(PARTICIPANTS_STORE);
  const existingParticipants = await participantsStore.getAll();

  for (const participant of existingParticipants) {
    if (participant.eventId === eventId) {
      await participantsStore.delete(participant.id);
    }
  }

  await eventsStore.delete(eventId);
  await tx.done;

  const remainingEvents = sortEvents(await db.getAll(EVENTS_STORE));
  if (getActiveEventId() === eventId) {
    setActiveEventId(remainingEvents[0]?.id || "");
  }

  return true;
}

export async function replaceParticipants(participants) {
  const db = await dbPromise;
  const tx = db.transaction(PARTICIPANTS_STORE, "readwrite");
  await tx.store.clear();

  for (const participant of participants) {
    await tx.store.put(participant);
  }

  await tx.done;
}

export async function getEvents() {
  const db = await dbPromise;
  await ensureDatabaseState(db);
  return sortEvents(await db.getAll(EVENTS_STORE));
}

export async function saveEvent(event) {
  const db = await dbPromise;
  await ensureDatabaseState(db);
  await db.put(EVENTS_STORE, event);
  return event;
}

export async function replaceEvents(events) {
  const db = await dbPromise;
  const tx = db.transaction(EVENTS_STORE, "readwrite");
  await tx.store.clear();

  for (const event of events) {
    await tx.store.put(event);
  }

  await tx.done;
  setActiveEventId(sortEvents(events)[0]?.id || "");
}
