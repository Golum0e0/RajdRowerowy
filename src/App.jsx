import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSession,
  createSession,
  getSessionExpiry,
  hasAdminPassword,
  hasValidSession,
  setupAdminPassword,
  verifyAdminPassword
} from "./lib/auth";
import {
  deleteEvent,
  deleteParticipant,
  getActiveEventId,
  getEvents,
  getParticipants,
  replaceEvents,
  replaceParticipants,
  saveEvent,
  saveParticipant,
  setActiveEventId
} from "./lib/db";
import { exportDatabaseBackup, exportToCsv, exportToPdf } from "./lib/exports";
import {
  ORGANIZER_INFO,
  ORGANIZER_TABS,
  formatEventDate,
  formatEventDistance,
  formatEventHeroLabel
} from "./lib/event";
import { getRideImagePath } from "./lib/rideImages";
import {
  createEmptyParticipant,
  DISTANCE_OPTIONS,
  formatDateTime,
  formatPhone,
  isAdult,
  maskPhoneInput,
  normalizePhone,
  validateParticipant
} from "./lib/utils";

const APP_SECTIONS = {
  signup: "signup",
  admin: "admin"
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const REQUIRED_FIELDS = ["firstName", "lastName", "birthDate", "phone", "consent"];

function createEmptyEventForm() {
  return {
    name: "",
    date: "",
    distanceKm: "",
    city: "",
    location: "",
    routeNote: ""
  };
}

function createEventShortName(name) {
  const letters = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return letters.slice(0, 4) || "RR";
}

function validateEventForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Podaj nazwe rajdu.";
  }

  if (!form.date) {
    errors.date = "Podaj date rajdu.";
  }

  if (!String(form.distanceKm).trim()) {
    errors.distanceKm = "Podaj liczbe kilometrow.";
  } else if (Number(form.distanceKm) <= 0 || Number.isNaN(Number(form.distanceKm))) {
    errors.distanceKm = "Liczba kilometrow musi byc wieksza od zera.";
  }

  if (!form.city.trim()) {
    errors.city = "Podaj miasto.";
  }

  if (!form.location.trim()) {
    errors.location = "Podaj miejsce startu lub biuro zawodow.";
  }

  if (!form.routeNote.trim()) {
    errors.routeNote = "Dodaj krotki opis trasy.";
  }

  return errors;
}

function Toast({ notice, onClose }) {
  if (!notice) {
    return null;
  }

  return (
    <div className={`toast toast--${notice.tone}`}>
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.text}</p>
      </div>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Zamknij komunikat">
        x
      </button>
    </div>
  );
}

function ConfirmModal({ dialog, onCancel, onConfirm, busy }) {
  if (!dialog) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">{dialog.title}</h3>
        <p>{dialog.description}</p>
        <div className="modal-actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={busy}>
            Anuluj
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Trwa..." : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingTableSkeleton({ rows = 6 }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function getVisibleErrors(errors, touched, submitted) {
  if (submitted) {
    return errors;
  }

  return Object.fromEntries(
    Object.entries(errors).filter(([fieldName]) => touched[fieldName])
  );
}

function LegacyParticipantForm({
  form,
  errors,
  touched,
  submitted,
  eventOptions = [],
  selectedEventId = "",
  onEventChange,
  onChange,
  onBlur,
  onSubmit,
  status,
  statusTone,
  title,
  subtitle,
  buttonLabel,
  compact = false,
  disabled = false,
  submitting = false
}) {
  const visibleErrors = getVisibleErrors(errors, touched, submitted);
  const hasVisibleErrors = Object.keys(visibleErrors).length > 0;

  function fieldClass(fieldName, baseClass = "") {
    const isInvalid = Boolean(visibleErrors[fieldName]);
    return `${baseClass} ${isInvalid ? "input--invalid" : ""}`.trim();
  }

  return (
    <article className={`panel panel--form ${compact ? "panel--compact" : ""}`}>
      <div className="panel__header">
        <div>
          <span className="section-label">{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit} noValidate>
        {eventOptions.length ? (
          <label className="form-grid__full">
            Rajd
            <select value={selectedEventId} onChange={onEventChange}>
              <option value="">Wybierz rajd</option>
              {eventOptions.map((eventOption) => (
                <option key={eventOption.id} value={eventOption.id}>
                  {`${eventOption.name} | ${formatEventDistance(eventOption.distanceKm)}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          Imie
          <input
            className={fieldClass("firstName")}
            name="firstName"
            value={form.firstName}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Anna"
            autoComplete="given-name"
          />
          {visibleErrors.firstName ? <span className="field-error">{visibleErrors.firstName}</span> : null}
        </label>

        <label>
          Nazwisko
          <input
            className={fieldClass("lastName")}
            name="lastName"
            value={form.lastName}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Kowalska"
            autoComplete="family-name"
          />
          {visibleErrors.lastName ? <span className="field-error">{visibleErrors.lastName}</span> : null}
        </label>

        <label>
          Data urodzenia
          <input
            className={fieldClass("birthDate")}
            type="date"
            name="birthDate"
            value={form.birthDate}
            onChange={onChange}
            onBlur={onBlur}
          />
          {visibleErrors.birthDate ? <span className="field-error">{visibleErrors.birthDate}</span> : null}
        </label>

        <label>
          Numer telefonu
          <input
            className={fieldClass("phone")}
            name="phone"
            value={form.phone}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="600 700 800"
            inputMode="tel"
            autoComplete="tel"
          />
          {visibleErrors.phone ? <span className="field-error">{visibleErrors.phone}</span> : null}
        </label>

        <label className="form-grid__full">
          Dystans
          <select name="distance" value={form.distance} onChange={onChange} onBlur={onBlur}>
            {DISTANCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={`checkbox form-grid__full ${visibleErrors.consent ? "checkbox--invalid" : ""}`}>
          <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} onBlur={onBlur} />
          <span>Zgoda na przetwarzanie danych osobowych na potrzeby organizacji rajdu.</span>
        </label>
        {visibleErrors.consent ? <span className="field-error field-error--full">{visibleErrors.consent}</span> : null}

        <div className="form-grid__full form-actions">
          <button type="submit" className="button button--primary" disabled={disabled || submitting}>
            {submitting ? "Zapisywanie..." : buttonLabel}
          </button>
          {status ? <p className={`form-status form-status--${statusTone}`}>{status}</p> : null}
        </div>

        {hasVisibleErrors ? (
          <p className="field-note form-grid__full">
            Sprawdz pola oznaczone na czerwono. Formularz zostanie odblokowany po poprawieniu danych.
          </p>
        ) : null}
      </form>
    </article>
  );
}

function ParticipantForm({
  form,
  errors,
  touched,
  submitted,
  eventOptions = [],
  selectedEventId = "",
  selectedEvent = null,
  onEventChange,
  onChange,
  onBlur,
  onSubmit,
  status,
  statusTone,
  title,
  subtitle,
  buttonLabel,
  compact = false,
  disabled = false,
  submitting = false
}) {
  const visibleErrors = getVisibleErrors(errors, touched, submitted);
  const hasVisibleErrors = Object.keys(visibleErrors).length > 0;
  const eventSelectionError =
    !compact && eventOptions.length > 0 && !selectedEventId && submitted
      ? "Wybierz rajd z listy."
      : "";

  function fieldClass(fieldName, baseClass = "") {
    const isInvalid = Boolean(visibleErrors[fieldName]);
    return `${baseClass} ${isInvalid ? "input--invalid" : ""}`.trim();
  }

  if (compact) {
    return (
      <LegacyParticipantForm
        form={form}
        errors={errors}
        touched={touched}
        submitted={submitted}
        eventOptions={eventOptions}
        selectedEventId={selectedEventId}
        onEventChange={onEventChange}
        onChange={onChange}
        onBlur={onBlur}
        onSubmit={onSubmit}
        status={status}
        statusTone={statusTone}
        title={title}
        subtitle={subtitle}
        buttonLabel={buttonLabel}
        compact={compact}
        disabled={disabled}
        submitting={submitting}
      />
    );
  }

  return (
    <article className="panel panel--form participant-panel">
      <div className="panel__header">
        <div>
          {subtitle ? <span className="section-label">{subtitle}</span> : null}
          <h2>{title}</h2>
        </div>
      </div>

      {selectedEvent ? (
        <div className="signup-event-card">
          <div className="signup-event-card__top">
            <span className="signup-event-card__meta">
              {`${formatEventDate(selectedEvent.date)} | ${selectedEvent.city}`}
            </span>
          </div>
          <h3>{selectedEvent.name}</h3>
          <div className="signup-event-card__quick">
            <span>{formatEventDistance(selectedEvent.distanceKm)}</span>
            <span>{selectedEvent.location}</span>
          </div>
        </div>
      ) : (
        <div className="signup-event-card signup-event-card--empty">
          <strong>Wybierz rajd z listy.</strong>
          <p>Po wskazaniu wydarzenia zobaczysz tutaj jego podstawowe informacje.</p>
        </div>
      )}

      <form className="participant-form" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <label className="form-grid__full">
            Rajd
            <select value={selectedEventId} onChange={onEventChange}>
              <option value="">Wybierz rajd</option>
              {eventOptions.map((eventOption) => (
                <option key={eventOption.id} value={eventOption.id}>
                  {`${eventOption.name} | ${formatEventDistance(eventOption.distanceKm)}`}
                </option>
              ))}
            </select>
            {eventSelectionError ? <span className="field-error">{eventSelectionError}</span> : null}
          </label>

          <label>
            Imie
            <input
              className={fieldClass("firstName")}
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Anna"
              autoComplete="given-name"
            />
            {visibleErrors.firstName ? <span className="field-error">{visibleErrors.firstName}</span> : null}
          </label>

          <label>
            Nazwisko
            <input
              className={fieldClass("lastName")}
              name="lastName"
              value={form.lastName}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Kowalska"
              autoComplete="family-name"
            />
            {visibleErrors.lastName ? <span className="field-error">{visibleErrors.lastName}</span> : null}
          </label>

          <label>
            Data urodzenia
            <input
              className={fieldClass("birthDate")}
              type="date"
              name="birthDate"
              value={form.birthDate}
              onChange={onChange}
              onBlur={onBlur}
            />
            {visibleErrors.birthDate ? <span className="field-error">{visibleErrors.birthDate}</span> : null}
          </label>

          <label>
            Numer telefonu
            <input
              className={fieldClass("phone")}
              name="phone"
              value={form.phone}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="600 700 800"
              inputMode="tel"
              autoComplete="tel"
            />
            {visibleErrors.phone ? <span className="field-error">{visibleErrors.phone}</span> : null}
          </label>

          <label className={`checkbox form-grid__full ${visibleErrors.consent ? "checkbox--invalid" : ""}`}>
            <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} onBlur={onBlur} />
            <span>
              Wyrazam zgode na przetwarzanie danych osobowych na potrzeby organizacji rajdu i przygotowania listy startowej.
            </span>
          </label>
          {visibleErrors.consent ? <span className="field-error field-error--full">{visibleErrors.consent}</span> : null}
        </div>

        <div className="signup-submit-card">
          <div>
            <span className="signup-submit-card__label">Finalizacja</span>
            <strong>{selectedEvent ? selectedEvent.name : "Wybierz rajd, aby kontynuowac"}</strong>
            <p>Po zapisaniu dane trafia od razu do listy uczestnikow wybranego wydarzenia.</p>
          </div>
          <div className="signup-submit-card__actions">
            <button type="submit" className="button button--primary" disabled={disabled || submitting}>
              {submitting ? "Zapisywanie..." : buttonLabel}
            </button>
            {status ? <p className={`form-status form-status--${statusTone}`}>{status}</p> : null}
          </div>
        </div>

        {hasVisibleErrors || eventSelectionError ? (
          <p className="field-note">
            Sprawdz pola oznaczone na czerwono. Formularz zostanie odblokowany po poprawieniu danych.
          </p>
        ) : null}
      </form>
    </article>
  );
}

function EventForm({
  form,
  errors,
  onChange,
  onSubmit,
  status,
  submitting,
  disabled
}) {
  return (
    <article className="panel panel--form">
      <div className="panel__header">
        <div>
          <span className="section-label">Nowy rajd</span>
          <h2>Dodaj wydarzenie</h2>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <label>
          Data
          <input
            className={errors.date ? "input--invalid" : ""}
            type="date"
            name="date"
            value={form.date}
            onChange={onChange}
          />
          {errors.date ? <span className="field-error">{errors.date}</span> : null}
        </label>

        <label>
          Kilometry
          <input
            className={errors.distanceKm ? "input--invalid" : ""}
            type="number"
            min="1"
            step="1"
            name="distanceKm"
            value={form.distanceKm}
            onChange={onChange}
          />
          {errors.distanceKm ? <span className="field-error">{errors.distanceKm}</span> : null}
        </label>

        <label className="form-grid__full">
          Nazwa rajdu
          <input
            className={errors.name ? "input--invalid" : ""}
            name="name"
            value={form.name}
            onChange={onChange}
          />
          {errors.name ? <span className="field-error">{errors.name}</span> : null}
        </label>

        <label>
          Miasto
          <input
            className={errors.city ? "input--invalid" : ""}
            name="city"
            value={form.city}
            onChange={onChange}
          />
          {errors.city ? <span className="field-error">{errors.city}</span> : null}
        </label>

        <label>
          Miejsce
          <input
            className={errors.location ? "input--invalid" : ""}
            name="location"
            value={form.location}
            onChange={onChange}
          />
          {errors.location ? <span className="field-error">{errors.location}</span> : null}
        </label>

        <label className="form-grid__full">
          Opis trasy
          <input
            className={errors.routeNote ? "input--invalid" : ""}
            name="routeNote"
            value={form.routeNote}
            onChange={onChange}
          />
          {errors.routeNote ? <span className="field-error">{errors.routeNote}</span> : null}
        </label>

        <div className="form-grid__full form-actions">
          <button type="submit" className="button button--primary" disabled={disabled || submitting}>
            {submitting ? "Tworzenie..." : "Dodaj rajd"}
          </button>
          {status ? <p className="form-status form-status--success">{status}</p> : null}
        </div>
      </form>
    </article>
  );
}

function OrganizerSection({ activeTab, onTabChange, activeEvent }) {
  const activeContent = ORGANIZER_TABS.find((tab) => tab.id === activeTab) ?? ORGANIZER_TABS[0];

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section className="footer-card">
          <span className="section-label section-label--light">Organizator</span>
          <h2>{ORGANIZER_INFO.name}</h2>
          <p>{activeEvent?.location || "Biuro zawodow zostanie podane po utworzeniu nowego rajdu."}</p>
          <div className="contact-list">
            <span>
              {activeEvent?.date ? formatEventDate(activeEvent.date) : "Termin wydarzenia nie zostal jeszcze ustawiony"}
            </span>
            <span>{ORGANIZER_INFO.email}</span>
            <span>{ORGANIZER_INFO.phone}</span>
            <span>{ORGANIZER_INFO.website}</span>
          </div>
        </section>

        <section className="footer-card footer-card--wide">
          <div className="doc-tabs">
            {ORGANIZER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`doc-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <article className="doc-content">
            <h3>{activeContent.title}</h3>
            {activeContent.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <ul>
              {activeContent.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </footer>
  );
}

function App() {
  const [section, setSection] = useState(APP_SECTIONS.signup);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [organizerTab, setOrganizerTab] = useState("regulations");

  const [form, setForm] = useState(createEmptyParticipant());
  const [formTouched, setFormTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formStatus, setFormStatus] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);

  const [adminForm, setAdminForm] = useState(createEmptyParticipant());
  const [adminTouched, setAdminTouched] = useState({});
  const [adminSubmitted, setAdminSubmitted] = useState(false);
  const [adminFormStatus, setAdminFormStatus] = useState("");
  const [submittingAdminForm, setSubmittingAdminForm] = useState(false);
  const [eventForm, setEventForm] = useState(createEmptyEventForm());
  const [eventFormStatus, setEventFormStatus] = useState("");
  const [submittingEventForm, setSubmittingEventForm] = useState(false);

  const [adminMode, setAdminMode] = useState(hasValidSession());
  const [authMode, setAuthMode] = useState(hasAdminPassword() ? "login" : "setup");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [sessionExpiry, setSessionExpiry] = useState(getSessionExpiry());

  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(getActiveEventId());
  const [signupEventId, setSignupEventId] = useState(getActiveEventId());
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [activeEventIdState, setActiveEventIdState] = useState(getActiveEventId());
  const [shouldScrollToSignup, setShouldScrollToSignup] = useState(false);

  const previousTotalRef = useRef(0);
  const importInputRef = useRef(null);
  const signupSectionRef = useRef(null);
  const contentRef = useRef(null);

  const formErrors = useMemo(() => validateParticipant(form), [form]);
  const adminFormErrors = useMemo(() => validateParticipant(adminForm), [adminForm]);
  const eventFormErrors = useMemo(() => validateEventForm(eventForm), [eventForm]);
  const isSignupValid = Object.keys(formErrors).length === 0;
  const isAdminFormValid = Object.keys(adminFormErrors).length === 0;
  const isEventFormValid = Object.keys(eventFormErrors).length === 0;

  async function refreshData() {
    setLoading(true);
    const [participantsData, eventsData] = await Promise.all([getParticipants(), getEvents()]);
    setParticipants(participantsData);
    setEvents(eventsData);

    const storedActiveEventId = getActiveEventId();
    const fallbackEventId = eventsData[0]?.id || "";
    const nextActiveEventId =
      eventsData.find((event) => event.id === storedActiveEventId)?.id || fallbackEventId;

    setActiveEventId(nextActiveEventId);
    setActiveEventIdState(nextActiveEventId);
    setSelectedEventId((current) =>
      current === "all" || eventsData.some((event) => event.id === current)
        ? current
        : nextActiveEventId
    );
    setSignupEventId((current) =>
      eventsData.some((event) => event.id === current) ? current : nextActiveEventId
    );
    setLoading(false);
  }

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const expires = getSessionExpiry();
      setSessionExpiry(expires);
      if (expires && expires <= Date.now()) {
        setAdminMode(false);
        clearSession();
        setAuthMessage("Sesja administratora wygasla. Zaloguj sie ponownie.");
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!shouldScrollToSignup || section !== APP_SECTIONS.signup) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      signupSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      setShouldScrollToSignup(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [section, shouldScrollToSignup]);

  const stats = useMemo(() => {
    const activeEventParticipants = participants.filter(
      (participant) => participant.eventId === activeEventIdState
    );
    const adults = activeEventParticipants.filter((participant) => isAdult(participant.birthDate)).length;
    const minors = activeEventParticipants.length - adults;
    return {
      total: activeEventParticipants.length,
      adults,
      minors
    };
  }, [activeEventIdState, participants]);

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventIdState) || null,
    [activeEventIdState, events]
  );

  const participantCountByEventId = useMemo(
    () =>
      participants.reduce((result, participant) => {
        const eventId = participant.eventId;
        if (!eventId) {
          return result;
        }
        result[eventId] = (result[eventId] || 0) + 1;
        return result;
      }, {}),
    [participants]
  );

  const managedEvent = useMemo(() => {
    if (selectedEventId === "all") {
      return null;
    }

    return events.find((event) => event.id === selectedEventId) || activeEvent;
  }, [activeEvent, events, selectedEventId]);

  const signupEvent = useMemo(
    () => events.find((event) => event.id === signupEventId) || activeEvent,
    [activeEvent, events, signupEventId]
  );

  const heroEvent = signupEvent || activeEvent;
  const heroEventIndex = useMemo(
    () => events.findIndex((event) => event.id === heroEvent?.id),
    [events, heroEvent]
  );
  const heroRegistrations = heroEvent ? participantCountByEventId[heroEvent.id] || 0 : 0;

  const eventShowcase = useMemo(
    () =>
      [...events]
        .sort((left, right) => {
          if (left.id === activeEventIdState) {
            return -1;
          }

          if (right.id === activeEventIdState) {
            return 1;
          }

          return new Date(left.date) - new Date(right.date);
        })
        .map((event) => ({
          ...event,
          registrations: participantCountByEventId[event.id] || 0,
          isActive: event.id === activeEventIdState
        })),
    [activeEventIdState, events, participantCountByEventId]
  );

  useEffect(() => {
    let frameId;
    const duration = 1000;
    const start = performance.now();
    const target = heroRegistrations;
    const initial = previousTotalRef.current;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedTotal(Math.round(initial + (target - initial) * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);
    previousTotalRef.current = target;

    return () => window.cancelAnimationFrame(frameId);
  }, [heroRegistrations]);

  const filteredParticipants = useMemo(() => {
    const phrase = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesSearch =
        !phrase ||
        [
          participant.firstName,
          participant.lastName,
          participant.phone,
          participant.distance,
          formatDateTime(participant.createdAt)
        ]
          .join(" ")
          .toLowerCase()
          .includes(phrase);

      const matchesEvent =
        selectedEventId === "all" ? true : participant.eventId === selectedEventId;

      return matchesSearch && matchesEvent;
    });
  }, [participants, search, selectedEventId]);

  const sortedParticipants = useMemo(() => {
    const items = [...filteredParticipants];
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;

    items.sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];

      if (key === "createdAt" || key === "birthDate") {
        return (new Date(leftValue) - new Date(rightValue)) * multiplier;
      }

      return String(leftValue).localeCompare(String(rightValue), "pl", {
        numeric: true,
        sensitivity: "base"
      }) * multiplier;
    });

    return items;
  }, [filteredParticipants, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedParticipants.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, sortConfig]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedParticipants.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedParticipants]);

  function handleSectionChange(nextSection) {
    setSection(nextSection);
    setMobileMenuOpen(false);

    window.requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function handleOpenSignup() {
    if (!hasHeroEvent) {
      handleSectionChange(APP_SECTIONS.admin);
      return;
    }

    if (heroEvent?.id) {
      setSignupEventId(heroEvent.id);
    }

    setShouldScrollToSignup(true);
    handleSectionChange(APP_SECTIONS.signup);
  }

  function handleCycleHeroEvent(direction) {
    if (!events.length) {
      return;
    }

    const currentIndex = heroEventIndex >= 0 ? heroEventIndex : 0;
    const nextIndex = (currentIndex + direction + events.length) % events.length;
    const nextEvent = events[nextIndex];

    if (nextEvent) {
      setSignupEventId(nextEvent.id);
    }
  }

  function createTouchedState() {
    return REQUIRED_FIELDS.reduce((result, fieldName) => {
      result[fieldName] = true;
      return result;
    }, {});
  }

  function handleInputChange(setter) {
    return (event) => {
      const { name, value, type, checked } = event.target;
      const nextValue =
        type === "checkbox" ? checked : name === "phone" ? maskPhoneInput(value) : value;

      setter((current) => ({
        ...current,
        [name]: nextValue
      }));
    };
  }

  function handleBlur(setTouched) {
    return (event) => {
      const { name } = event.target;
      setTouched((current) => ({
        ...current,
        [name]: true
      }));
    };
  }

  async function persistParticipant({
    formState,
    errors,
    setTouched,
    setSubmitted,
    setStatus,
    setSubmitting,
    resetForm,
    resetTouched,
    successTitle,
    successText,
    eventId
  }) {
    setSubmitted(true);

    if (Object.keys(errors).length > 0) {
      setTouched(createTouchedState());
      setStatus("Popraw formularz przed zapisaniem.");
      setNotice({
        tone: "warning",
        title: "Formularz wymaga poprawek",
        text: "Sprawdz pola oznaczone na czerwono i sprobuj ponownie."
      });
      return;
    }

    const targetEvent = events.find((event) => event.id === eventId);

    if (!eventId || !targetEvent) {
      setStatus("Wybierz rajd przed zapisaniem.");
      setNotice({
        tone: "warning",
        title: "Brak wybranego rajdu",
        text: "Wybierz rajd z listy, a potem zapisz uczestnika."
      });
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const participant = {
        id: crypto.randomUUID(),
        eventId,
        ...formState,
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        phone: normalizePhone(formState.phone),
        createdAt: new Date().toISOString()
      };

      await saveParticipant(participant);
      resetForm(createEmptyParticipant());
      resetTouched({});
      setSubmitted(false);
      setStatus(`${successText} ${targetEvent.name}.`);
      setNotice({
        tone: "success",
        title: successTitle,
        text: `${successText} ${targetEvent.name}.`
      });
      await refreshData();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    await persistParticipant({
      formState: {
        ...form,
        distance: signupEvent ? formatEventDistance(signupEvent.distanceKm) : form.distance
      },
      errors: formErrors,
      setTouched: setFormTouched,
      setSubmitted: setFormSubmitted,
      setStatus: setFormStatus,
      setSubmitting: setSubmittingForm,
      resetForm: setForm,
      resetTouched: setFormTouched,
      successTitle: "Zapis przyjety",
      successText: "Dziekujemy. Twoje zgloszenie zostalo zapisane na liscie startowej dla rajdu",
      eventId: signupEventId
    });
  }

  async function handleAdminAdd(event) {
    event.preventDefault();
    await persistParticipant({
      formState: adminForm,
      errors: adminFormErrors,
      setTouched: setAdminTouched,
      setSubmitted: setAdminSubmitted,
      setStatus: setAdminFormStatus,
      setSubmitting: setSubmittingAdminForm,
      resetForm: setAdminForm,
      resetTouched: setAdminTouched,
      successTitle: "Dodano zawodnika",
      successText: "Rekord zostal dopisany przez panel administratora do rajdu",
      eventId: activeEventIdState
    });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthMessage("");

    if (authMode === "setup") {
      if (password.length < 8) {
        setAuthMessage("Haslo musi miec co najmniej 8 znakow.");
        return;
      }

      if (password !== confirmPassword) {
        setAuthMessage("Hasla nie sa takie same.");
        return;
      }

      await setupAdminPassword(password);
      createSession();
      setSessionExpiry(getSessionExpiry());
      setAdminMode(true);
      setAuthMode("login");
      setPassword("");
      setConfirmPassword("");
      setAuthMessage("Panel zostal zabezpieczony.");
      setNotice({
        tone: "success",
        title: "Panel gotowy",
        text: "Haslo administratora zostalo zapisane."
      });
      return;
    }

    const verified = await verifyAdminPassword(password);
    if (!verified) {
      setAuthMessage("Niepoprawne haslo.");
      return;
    }

    createSession();
    setSessionExpiry(getSessionExpiry());
    setAdminMode(true);
    setPassword("");
    setAuthMessage("Zalogowano.");
    setNotice({
      tone: "success",
      title: "Zalogowano",
      text: "Mozesz teraz zarzadzac lista startowa i eksportami."
    });
  }

  function handleLogout() {
    clearSession();
    setSessionExpiry(0);
    setAdminMode(false);
    setAuthMessage("Wylogowano.");
  }

  function toggleSort(key) {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key ? (current.direction === "asc" ? "desc" : "asc") : "asc"
    }));
  }

  function sortMark(key) {
    if (sortConfig.key !== key) {
      return "+/-";
    }

    return sortConfig.direction === "asc" ? "ASC" : "DESC";
  }

  function handlePrint() {
    window.print();
  }

  function openDeleteDialog(participant) {
    setDialog({
      type: "delete",
      participant,
      title: "Usunac zawodnika?",
      description: `${participant.firstName} ${participant.lastName} zostanie trwale usuniety z listy startowej.`,
      confirmLabel: "Usun wpis"
    });
  }

  function openDeleteEventDialog(eventItem) {
    const participantCount = participantCountByEventId[eventItem.id] || 0;

    setDialog({
      type: "delete-event",
      eventItem,
      title: "Usunac rajd?",
      description: `${eventItem.name} zostanie trwale usuniety razem z ${participantCount} zapisami przypisanymi do tego rajdu.`,
      confirmLabel: "Usun rajd"
    });
  }

  async function handleSetActiveEvent(eventId) {
    setActiveEventId(eventId);
    setActiveEventIdState(eventId);
    setSelectedEventId(eventId);
    setSignupEventId(eventId);
    setNotice({
      tone: "success",
      title: "Aktywny rajd zmieniony",
      text: "Nowe zapisy beda trafialy do wybranego rajdu."
    });
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    setEventFormStatus("");

    if (Object.keys(eventFormErrors).length) {
      setNotice({
        tone: "warning",
        title: "Nie mozna utworzyc rajdu",
        text: "Uzupelnij wszystkie pola formularza wydarzenia."
      });
      return;
    }

    setSubmittingEventForm(true);
    try {
      const newEvent = {
        id: crypto.randomUUID(),
        shortName: createEventShortName(eventForm.name),
        name: eventForm.name.trim(),
        date: eventForm.date,
        distanceKm: Number(eventForm.distanceKm),
        city: eventForm.city.trim(),
        location: eventForm.location.trim(),
        routeNote: eventForm.routeNote.trim(),
        createdAt: new Date().toISOString()
      };

      await saveEvent(newEvent);
      setActiveEventId(newEvent.id);
      setActiveEventIdState(newEvent.id);
      setSelectedEventId(newEvent.id);
      setSignupEventId(newEvent.id);
      setEventForm(createEmptyEventForm());
      setEventFormStatus("Nowy rajd zostal dodany i ustawiony jako aktywny.");
      await refreshData();
      setNotice({
        tone: "success",
        title: "Dodano nowy rajd",
        text: `${newEvent.name} jest teraz aktywnym wydarzeniem.`
      });
    } finally {
      setSubmittingEventForm(false);
    }
  }

  function sanitizeImportedParticipants(records) {
    return records
      .filter((record) => record && typeof record === "object")
      .map((record) => ({
        id: record.id || crypto.randomUUID(),
        eventId: record.eventId ? String(record.eventId) : undefined,
        firstName: String(record.firstName || "").trim(),
        lastName: String(record.lastName || "").trim(),
        birthDate: String(record.birthDate || ""),
        phone: normalizePhone(String(record.phone || "")),
        distance: DISTANCE_OPTIONS.includes(record.distance) ? record.distance : DISTANCE_OPTIONS[0],
        consent: Boolean(record.consent),
        createdAt:
          record.createdAt && !Number.isNaN(new Date(record.createdAt).getTime())
            ? record.createdAt
            : new Date().toISOString()
      }))
      .filter((participant) => Object.keys(validateParticipant(participant)).length === 0);
  }

  function sanitizeImportedEvents(records) {
    return records
      .filter((record) => record && typeof record === "object")
      .map((record) => ({
        id: record.id || crypto.randomUUID(),
        name: String(record.name || "").trim(),
        shortName:
          String(record.shortName || "").trim().toUpperCase().slice(0, 4) ||
          createEventShortName(String(record.name || "")),
        date: String(record.date || ""),
        distanceKm: Number(record.distanceKm),
        city: String(record.city || "").trim(),
        location: String(record.location || "").trim(),
        routeNote: String(record.routeNote || "").trim(),
        createdAt:
          record.createdAt && !Number.isNaN(new Date(record.createdAt).getTime())
            ? record.createdAt
            : new Date().toISOString()
      }))
      .filter(
        (event) =>
          event.name &&
          event.date &&
          event.distanceKm > 0 &&
          event.city &&
          event.location &&
          event.routeNote
      );
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      const source = Array.isArray(parsed) ? parsed : parsed.participants;
      const importedParticipants = sanitizeImportedParticipants(source || []);
      const importedEvents = sanitizeImportedEvents(parsed.events || []);
      const fallbackEventId = importedEvents[0]?.id || activeEventIdState || "";

      if (!importedParticipants.length) {
        setNotice({
          tone: "warning",
          title: "Brak poprawnych rekordow",
          text: "Wybrany plik nie zawiera poprawnej kopii bazy."
        });
        return;
      }

      if (!importedEvents.length) {
        setNotice({
          tone: "warning",
          title: "Brak rajdow w pliku",
          text: "Import uczestnikow wymaga co najmniej jednego poprawnego rajdu w kopii bazy."
        });
        return;
      }

      setDialog({
        type: "import",
        participants: importedParticipants.map((participant) => ({
          ...participant,
          eventId:
            importedEvents.length && importedEvents.some((event) => event.id === participant.eventId)
              ? participant.eventId
              : fallbackEventId
        })),
        events: importedEvents,
        activeEventId: importedEvents.some((event) => event.id === parsed.activeEventId)
          ? parsed.activeEventId
          : fallbackEventId,
        title: "Zastapic aktualna baze?",
        description: `Plik zawiera ${importedParticipants.length} poprawnych rekordow. Aktualna lista zostanie zastapiona importem.`,
        confirmLabel: "Importuj baze"
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Nie mozna odczytac pliku",
        text: "Sprawdz, czy wybrany plik jest poprawnym plikiem JSON z kopia bazy."
      });
    }
  }

  async function handleConfirmDialog() {
    if (!dialog) {
      return;
    }

    setDialogBusy(true);

    try {
      if (dialog.type === "delete") {
        await deleteParticipant(dialog.participant.id);
        await refreshData();
        setNotice({
          tone: "success",
          title: "Usunieto wpis",
          text: "Uczestnik zostal usuniety z listy startowej."
        });
      }

      if (dialog.type === "delete-event") {
        const fallbackEvent = events.find((event) => event.id !== dialog.eventItem.id);
        await deleteEvent(dialog.eventItem.id);

        if (activeEventIdState === dialog.eventItem.id) {
          setActiveEventId(fallbackEvent?.id || "");
          setActiveEventIdState(fallbackEvent?.id || "");
        }

        if (selectedEventId === dialog.eventItem.id) {
          setSelectedEventId(fallbackEvent?.id || "all");
        }

        if (signupEventId === dialog.eventItem.id) {
          setSignupEventId(fallbackEvent?.id || "");
        }

        await refreshData();
        setNotice({
          tone: "success",
          title: "Usunieto rajd",
          text: `${dialog.eventItem.name} zostal usuniety razem z przypisanymi zapisami.`
        });
      }

      if (dialog.type === "import") {
        await replaceParticipants(dialog.participants);
        if (dialog.events?.length) {
          await replaceEvents(dialog.events);
          setActiveEventId(dialog.activeEventId || dialog.events[0].id);
          setActiveEventIdState(dialog.activeEventId || dialog.events[0].id);
          setSelectedEventId(dialog.activeEventId || dialog.events[0].id);
          setSignupEventId(dialog.activeEventId || dialog.events[0].id);
        }
        await refreshData();
        setNotice({
          tone: "success",
          title: "Import zakonczony",
          text: `Baza danych zostala zastapiona. Zaimportowano ${dialog.participants.length} rekordow.`
        });
      }

      setDialog(null);
    } finally {
      setDialogBusy(false);
    }
  }

  const pageSummary =
    sortedParticipants.length === 0
      ? "Brak rekordow"
      : `${(currentPage - 1) * pageSize + 1}-${Math.min(
          currentPage * pageSize,
          sortedParticipants.length
        )} z ${sortedParticipants.length}`;

  const exportEvent =
    selectedEventId === "all"
      ? {
          name: "Wszystkie rajdy",
          date: activeEvent?.date || "",
          city: ""
        }
      : managedEvent || activeEvent || { name: "Brak rajdu", date: "", city: "", distanceKm: "" };
  const hasActiveEvent = Boolean(activeEvent);
  const hasHeroEvent = Boolean(heroEvent);
  const brandTitle = heroEvent?.name || "Panel Rajdow Rowerowych";
  const brandSubtitle = heroEvent
    ? formatEventHeroLabel(heroEvent)
    : "Brak aktywnego rajdu";
  const heroEyebrow = heroEvent
    ? formatEventHeroLabel(heroEvent)
    : "Lista rajdow i uczestnikow jest pusta";
  const heroTitle = heroEvent?.name || "Brak aktywnego rajdu";
  const heroDescription =
    heroEvent?.routeNote ||
    "Dodaj nowy rajd w panelu administratora, aby uruchomic zapisy i liste startowa.";
  const heroImageSrc = getRideImagePath(heroEvent, events);

  return (
    <>
      <Toast notice={notice} onClose={() => setNotice(null)} />
      <ConfirmModal
        dialog={dialog}
        onCancel={() => setDialog(null)}
        onConfirm={handleConfirmDialog}
        busy={dialogBusy}
      />

      <div className="app-shell">
        <header className="hero">
          <div className="hero__glow hero__glow--one" />
          <div className="hero__glow hero__glow--two" />

          <nav className="topbar">
            <button
              type="button"
              className="brand"
              onClick={() => handleSectionChange(APP_SECTIONS.signup)}
              aria-label="Przejdz do formularza zapisow"
            >
              <span className="brand__text">
                <strong>{brandTitle}</strong>
                <span>{brandSubtitle}</span>
              </span>
            </button>

            <button
              type="button"
              className="menu-toggle"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label="Otworz menu"
            >
              <span />
              <span />
              <span />
            </button>

            <div className={`nav-links ${mobileMenuOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className={section === APP_SECTIONS.signup ? "active" : ""}
                onClick={() => handleSectionChange(APP_SECTIONS.signup)}
              >
                Zapisy
              </button>
              <button
                type="button"
                className={section === APP_SECTIONS.admin ? "active" : ""}
                onClick={() => handleSectionChange(APP_SECTIONS.admin)}
              >
                Administrator
              </button>
            </div>
          </nav>

          <section className="hero__content hero__content--rich">
            <div className="hero__copy">
              <span className="eyebrow">{heroEyebrow}</span>
              <h1>{heroTitle}</h1>
              <p>{heroDescription}</p>

              {hasHeroEvent && events.length > 1 ? (
                <div className="hero-switcher">
                  <button
                    type="button"
                    className="hero-switcher__button"
                    onClick={() => handleCycleHeroEvent(-1)}
                    aria-label="Pokaz poprzedni rajd"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    className="hero-switcher__button"
                    onClick={() => handleCycleHeroEvent(1)}
                    aria-label="Pokaz nastepny rajd"
                  >
                    {">"}
                  </button>
                </div>
              ) : null}

              {hasHeroEvent ? (
                <div className="hero__details">
                  <div className="hero-detail">
                    <span>Data</span>
                    <strong>{formatEventDate(heroEvent.date)}</strong>
                  </div>
                  <div className="hero-detail">
                    <span>Dystans rajdu</span>
                    <strong>{formatEventDistance(heroEvent.distanceKm)}</strong>
                  </div>
                  <div className="hero-detail">
                    <span>Miejsce</span>
                    <strong>{heroEvent.city}</strong>
                  </div>
                  <div className="hero-detail">
                    <span>Biuro zawodow</span>
                    <strong>{heroEvent.location}</strong>
                  </div>
                </div>
              ) : (
                <div className="hero-empty-note">
                  <strong>Brak rajdow w bazie.</strong>
                  <p>Dodaj nowe wydarzenie w panelu administratora, a formularz zapisow pojawi sie automatycznie.</p>
                </div>
              )}

              <div className="hero__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleOpenSignup}
                >
                  {hasHeroEvent ? "Zapisz sie" : "Otworz administratora"}
                </button>
              </div>
            </div>

            <aside className="hero__dashboard hero__dashboard--visual">
              <div className="hero-visual">
                <img
                  className="hero-visual__art"
                  src={heroImageSrc}
                  alt={hasHeroEvent ? `Ilustracja wydarzenia ${heroEvent.name}` : "Ilustracja rajdu rowerowego"}
                />
                <div className="hero-counter">
                  <span className="hero-card__label">Liczba zapisanych osob</span>
                  <strong>{animatedTotal}</strong>
                </div>
              </div>
            </aside>
          </section>
        </header>

        <main ref={contentRef} className="content">
          {section === APP_SECTIONS.signup ? (
            <section ref={signupSectionRef} className="main-grid main-grid--single">
              {hasActiveEvent ? (
                <ParticipantForm
                  form={form}
                  errors={formErrors}
                  touched={formTouched}
                  submitted={formSubmitted}
                  eventOptions={events}
                  selectedEventId={signupEventId}
                  selectedEvent={signupEvent}
                  onEventChange={(event) => setSignupEventId(event.target.value)}
                  onChange={handleInputChange(setForm)}
                  onBlur={handleBlur(setFormTouched)}
                  onSubmit={handleSignupSubmit}
                  status={formStatus}
                  statusTone="success"
                  title="Formularz zapisow"
                  subtitle=""
                  buttonLabel="Potwierdz zapis"
                  disabled={!isSignupValid || !signupEventId}
                  submitting={submittingForm}
                />
              ) : (
                <article className="panel">
                  <div className="empty-state-box">
                    <strong>Brak dostepnych rajdow.</strong>
                    <p>Zaloguj sie do panelu administratora i dodaj nowe wydarzenie, aby otworzyc zapisy.</p>
                  </div>
                </article>
              )}
            </section>
          ) : (
            <section className="admin-grid">
              <div className="stack">
                <article className="panel panel--admin-hub">
                  <div className="panel__header">
                    <div>
                      <span className="section-label">Administrator</span>
                      <h2>{adminMode ? "Panel zarzadzania" : "Logowanie"}</h2>
                    </div>
                    {adminMode ? (
                      <span className="status-badge status-badge--dark">
                        Sesja do{" "}
                        {sessionExpiry
                          ? new Intl.DateTimeFormat("pl-PL", {
                              hour: "2-digit",
                              minute: "2-digit"
                            }).format(new Date(sessionExpiry))
                          : "--:--"}
                      </span>
                    ) : null}
                  </div>

                  {!adminMode ? (
                    <form className="form-grid" onSubmit={handleAuthSubmit}>
                      <label className="form-grid__full">
                        {authMode === "setup" ? "Utworz haslo administratora" : "Haslo"}
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="minimum 8 znakow"
                          required
                        />
                      </label>

                      {authMode === "setup" ? (
                        <label className="form-grid__full">
                          Powtorz haslo
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="powtorz haslo"
                            required
                          />
                        </label>
                      ) : null}

                      <div className="form-grid__full form-actions">
                        <button type="submit" className="button button--primary">
                          {authMode === "setup" ? "Zabezpiecz panel" : "Zaloguj"}
                        </button>
                        {authMessage ? <p className="form-status form-status--neutral">{authMessage}</p> : null}
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="admin-overview">
                        <article className={`admin-stat ${hasActiveEvent ? "is-featured" : ""}`}>
                          <span className="admin-stat__label">Aktywny rajd</span>
                          <strong>{activeEvent?.name || "Brak aktywnego rajdu"}</strong>
                          <p>
                            {activeEvent
                              ? `${formatEventDate(activeEvent.date)} | ${formatEventDistance(activeEvent.distanceKm)}`
                              : "Dodaj nowe wydarzenie, aby uruchomic zapisy."}
                          </p>
                        </article>

                        <article className="admin-stat">
                          <span className="admin-stat__label">Wszystkie rajdy</span>
                          <strong>{events.length}</strong>
                          <p>{events.length ? "Dostepne w bazie danych" : "Brak zapisanych wydarzen"}</p>
                        </article>

                        <article className="admin-stat">
                          <span className="admin-stat__label">Wszyscy uczestnicy</span>
                          <strong>{participants.length}</strong>
                          <p>
                            {hasActiveEvent
                              ? `${stats.total} w aktywnym rajdzie`
                              : "Po dodaniu rajdu pojawia sie tutaj licznik"}
                          </p>
                        </article>
                      </div>

                      <div className="admin-toolbar">
                        <div className="admin-toolbar__group">
                          <button type="button" className="button button--primary" onClick={handlePrint}>
                            Drukuj
                          </button>
                          <button
                            type="button"
                            className="button"
                            onClick={() => exportToCsv(sortedParticipants)}
                          >
                            CSV
                          </button>
                          <button
                            type="button"
                            className="button"
                            onClick={() => exportToPdf(sortedParticipants, exportEvent)}
                          >
                            PDF
                          </button>
                        </div>

                        <div className="admin-toolbar__group">
                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              exportDatabaseBackup({
                                participants,
                                events,
                                activeEventId: activeEventIdState
                              })
                            }
                          >
                            Kopia JSON
                          </button>
                          <button
                            type="button"
                            className="button"
                            onClick={() => importInputRef.current?.click()}
                          >
                            Import bazy
                          </button>
                          <button type="button" className="button button--ghost" onClick={handleLogout}>
                            Wyloguj
                          </button>
                        </div>
                      </div>

                      <div className="admin-filters">
                        <label>
                          Rajd
                          <select
                            value={selectedEventId}
                            onChange={(event) => setSelectedEventId(event.target.value)}
                          >
                            <option value="all">Wszystkie rajdy</option>
                            {events.map((eventItem) => (
                              <option key={eventItem.id} value={eventItem.id}>
                                {eventItem.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Szukaj
                          <input
                            className="search-input"
                            placeholder="Imie, nazwisko, telefon"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                          />
                        </label>

                        <label>
                          Na stronie
                          <select
                            value={pageSize}
                            onChange={(event) => setPageSize(Number(event.target.value))}
                          >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {eventShowcase.length ? (
                        <div className="ride-showcase">
                          {eventShowcase.map((eventItem) => (
                            <button
                              key={eventItem.id}
                              type="button"
                              className={`ride-card ${eventItem.isActive ? "is-active" : ""}`}
                              onClick={() => handleSetActiveEvent(eventItem.id)}
                              disabled={eventItem.isActive}
                            >
                              <div className="ride-card__header">
                                <span className="ride-card__distance">
                                  {formatEventDistance(eventItem.distanceKm)}
                                </span>
                                <span className={`ride-card__status ${eventItem.isActive ? "is-live" : ""}`}>
                                  {eventItem.isActive ? "Aktywny rajd" : "Kliknij, aby aktywowac"}
                                </span>
                              </div>
                              <strong>{eventItem.name}</strong>
                              <p>{`${formatEventDate(eventItem.date)} | ${eventItem.city}`}</p>
                              <div className="ride-card__footer">
                                <span>{eventItem.shortName}</span>
                                <strong>{eventItem.registrations} zapisow</strong>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state-box ride-showcase-empty">
                          <strong>Brak aktywnych rajdow.</strong>
                          <p>Dodaj wydarzenie, aby wyswietlic je w szybkim podgladzie panelu administratora.</p>
                        </div>
                      )}
                    </>
                  )}
                </article>

                {adminMode && hasActiveEvent ? (
                  <ParticipantForm
                    form={adminForm}
                    errors={adminFormErrors}
                    touched={adminTouched}
                    submitted={adminSubmitted}
                    onChange={handleInputChange(setAdminForm)}
                    onBlur={handleBlur(setAdminTouched)}
                    onSubmit={handleAdminAdd}
                    status={adminFormStatus}
                    statusTone="success"
                    title="Dodaj zawodnika"
                    subtitle="Nowy wpis"
                    buttonLabel="Dodaj"
                    compact
                    disabled={!isAdminFormValid}
                    submitting={submittingAdminForm}
                  />
                ) : null}

                {adminMode && !hasActiveEvent ? (
                  <article className="panel">
                    <div className="empty-state-box">
                      <strong>Brak aktywnego rajdu.</strong>
                      <p>Najpierw dodaj nowe wydarzenie, a potem bedziesz mogl dopisywac uczestnikow.</p>
                    </div>
                  </article>
                ) : null}

                {adminMode ? (
                  <EventForm
                    form={eventForm}
                    errors={eventFormErrors}
                    onChange={handleInputChange(setEventForm)}
                    onSubmit={handleEventSubmit}
                    status={eventFormStatus}
                    submitting={submittingEventForm}
                    disabled={!isEventFormValid}
                  />
                ) : null}

                {adminMode ? (
                  <article className="panel panel--table">
                    <div className="panel__header">
                      <div>
                        <span className="section-label">Wydarzenia</span>
                        <h2>Lista rajdow</h2>
                      </div>
                      <span className="table-summary">{events.length} wydarzen</span>
                    </div>

                    {loading ? (
                      <LoadingTableSkeleton rows={4} />
                    ) : events.length === 0 ? (
                      <div className="empty-state-box">
                        <strong>Brak rajdow.</strong>
                        <p>Dodaj nowe wydarzenie z formularza administratora.</p>
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Nazwa</th>
                              <th>Data</th>
                              <th>Miasto</th>
                              <th>Km</th>
                              <th>Zapisy</th>
                              <th>Status</th>
                              <th>Akcja</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events.map((eventItem) => (
                              <tr key={eventItem.id}>
                                <td>{eventItem.name}</td>
                                <td>{formatEventDate(eventItem.date)}</td>
                                <td>{eventItem.city}</td>
                                <td>{formatEventDistance(eventItem.distanceKm)}</td>
                                <td>{participantCountByEventId[eventItem.id] || 0}</td>
                                <td>
                                  {eventItem.id === activeEventIdState ? (
                                    <span className="event-badge">Aktywny</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="button button--ghost"
                                      onClick={() => handleSetActiveEvent(eventItem.id)}
                                    >
                                      Ustaw aktywny
                                    </button>
                                  )}
                                </td>
                                <td>
                                  <div className="table-actions">
                                    <button
                                      type="button"
                                      className="button button--danger"
                                      onClick={() => openDeleteEventDialog(eventItem)}
                                    >
                                      Usun
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                ) : null}
              </div>

              <article className="panel panel--table">
                <div className="panel__header">
                  <div>
                    <span className="section-label">Lista startowa</span>
                    <h2>Uczestnicy</h2>
                  </div>
                  {adminMode ? <span className="table-summary">{pageSummary}</span> : null}
                </div>

                {!adminMode ? (
                  <div className="empty-state-box">
                    <strong>Lista jest dostepna po zalogowaniu.</strong>
                    <p>Panel administratora odblokowuje eksport, import, sortowanie i zarzadzanie zapisami.</p>
                  </div>
                ) : loading ? (
                  <LoadingTableSkeleton rows={pageSize} />
                ) : sortedParticipants.length === 0 ? (
                  <div className="empty-state-box">
                    <strong>Brak uczestnikow.</strong>
                    <p>Zmodyfikuj filtry lub dodaj nowy rekord z panelu administratora.</p>
                  </div>
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>
                              <button type="button" className="table-sort" onClick={() => toggleSort("firstName")}>
                                Imie <span>{sortMark("firstName")}</span>
                              </button>
                            </th>
                            <th>
                              <button type="button" className="table-sort" onClick={() => toggleSort("lastName")}>
                                Nazwisko <span>{sortMark("lastName")}</span>
                              </button>
                            </th>
                            <th>
                              <button type="button" className="table-sort" onClick={() => toggleSort("birthDate")}>
                                Data urodzenia <span>{sortMark("birthDate")}</span>
                              </button>
                            </th>
                            <th>
                              <button type="button" className="table-sort" onClick={() => toggleSort("phone")}>
                                Telefon <span>{sortMark("phone")}</span>
                              </button>
                            </th>
                            <th>
                              <button type="button" className="table-sort" onClick={() => toggleSort("distance")}>
                                Dystans <span>{sortMark("distance")}</span>
                              </button>
                            </th>
                            <th>
                              <button type="button" className="table-sort" onClick={() => toggleSort("createdAt")}>
                                Dodano <span>{sortMark("createdAt")}</span>
                              </button>
                            </th>
                            <th>Akcja</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedParticipants.map((participant) => (
                            <tr key={participant.id}>
                              <td>{participant.firstName}</td>
                              <td>{participant.lastName}</td>
                              <td>
                                {new Intl.DateTimeFormat("pl-PL").format(new Date(participant.birthDate))}
                              </td>
                              <td>{formatPhone(participant.phone)}</td>
                              <td>{participant.distance}</td>
                              <td>{formatDateTime(participant.createdAt)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="button button--danger"
                                  onClick={() => openDeleteDialog(participant)}
                                >
                                  Usun
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pagination">
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                      >
                        Poprzednia
                      </button>
                      <span className="pagination__status">
                        Strona {currentPage} z {totalPages}
                      </span>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Nastepna
                      </button>
                    </div>
                  </>
                )}
              </article>
            </section>
          )}
        </main>

        <OrganizerSection
          activeTab={organizerTab}
          onTabChange={setOrganizerTab}
          activeEvent={activeEvent}
        />

        <input
          ref={importInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json"
          onChange={handleImportFile}
        />
      </div>
    </>
  );
}

export default App;
