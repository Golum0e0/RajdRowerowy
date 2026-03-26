const RIDE_IMAGE_PATHS = ["/rajdy/zdjecie1.jpg", "/rajdy/zdjecie2.jpg"];

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRideImagePath(event, events = []) {
  if (!event) {
    return "/hero-ride.svg";
  }

  if (!RIDE_IMAGE_PATHS.length) {
    return "/hero-ride.svg";
  }

  const eventCandidates = [event.name, event.id, event.shortName].map(normalizeName).filter(Boolean);
  const matchedPath = RIDE_IMAGE_PATHS.find((path) => {
    const imageName = normalizeName(path.split("/").pop());
    return eventCandidates.some(
      (candidate) => candidate === imageName || candidate.includes(imageName) || imageName.includes(candidate)
    );
  });

  if (matchedPath) {
    return matchedPath;
  }

  const index = events.findIndex((item) => item.id === event.id);
  if (index === -1) {
    return RIDE_IMAGE_PATHS[0];
  }

  return RIDE_IMAGE_PATHS[index % RIDE_IMAGE_PATHS.length];
}
