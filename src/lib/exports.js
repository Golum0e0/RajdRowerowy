import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatEventDate, formatEventDistance } from "./event";

function formatBirthDate(date) {
  return new Intl.DateTimeFormat("pl-PL").format(new Date(date));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToCsv(participants) {
  const headers = [
    "Imie",
    "Nazwisko",
    "Data urodzenia",
    "Telefon",
    "Dystans",
    "Status zgody",
    "Data zapisu"
  ];

  const rows = participants.map((participant) => [
    participant.firstName,
    participant.lastName,
    formatBirthDate(participant.birthDate),
    participant.phone,
    participant.distance,
    participant.consent ? "zaakceptowano" : "brak",
    new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(participant.createdAt))
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    "lista-uczestnikow-rajd.csv"
  );
}

export function exportToPdf(participants, event) {
  const doc = new jsPDF({
    orientation: "landscape"
  });

  doc.setFontSize(18);
  doc.text(event?.name || "Lista uczestnikow rajdu rowerowego", 14, 14);
  doc.setFontSize(10);
  doc.text(
    [
      formatEventDate(event?.date || ""),
      event?.city || "",
      formatEventDistance(event?.distanceKm)
    ]
      .filter(Boolean)
      .join(" | "),
    14,
    20
  );

  autoTable(doc, {
    startY: 26,
    head: [["Imie", "Nazwisko", "Data urodzenia", "Telefon", "Dystans", "Data zapisu"]],
    body: participants.map((participant) => [
      participant.firstName,
      participant.lastName,
      formatBirthDate(participant.birthDate),
      participant.phone,
      participant.distance,
      new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(participant.createdAt))
    ]),
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [22, 48, 71]
    }
  });

  doc.save("lista-uczestnikow-rajd.pdf");
}

export function exportDatabaseBackup({ participants, events, activeEventId }) {
  const payload = {
    exportedAt: new Date().toISOString(),
    activeEventId,
    events,
    participants
  };

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" }),
    "baza-rajd-rowerowy.json"
  );
}
