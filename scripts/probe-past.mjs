const urls = [
  "https://www.4dmoon.com/past-results?date=2025-05-31",
  "https://www.4dmoon.com/api/past-results?date=2025-05-31",
  "https://www.4dmoon.com/past-results/2025-05-31",
];

for (const url of urls) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const t = await res.text();
    console.log(
      url,
      res.status,
      t.length,
      t.includes("fourDResult") || t.includes("5984") || t.includes("MAGNUM"),
      t.slice(0, 200).replace(/\s+/g, " ")
    );
  } catch (e) {
    console.log(url, e.message);
  }
}
