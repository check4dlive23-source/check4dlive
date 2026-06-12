import { fetchSabah645ForDate } from "../src/lib/ingest/diriwan88";

void (async () => {
  const r = await fetchSabah645ForDate("2026-06-10");
  console.log(JSON.stringify(r, null, 2));
})();
