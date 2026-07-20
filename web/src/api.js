const API = "";

export async function fetchFish({ q = "", region = "Tümü" } = {}) {
  const params = new URLSearchParams({ q, region });
  const res = await fetch(`${API}/api/fish?${params}`);
  if (!res.ok) throw new Error("Balık listesi alınamadı");
  return res.json();
}

export async function fetchFishById(id) {
  const res = await fetch(`${API}/api/fish/${id}`);
  if (!res.ok) throw new Error("Balık bulunamadı");
  return res.json();
}

export async function identifyImage(blob) {
  const body = new FormData();
  body.append("image", blob, "scan.jpg");
  const res = await fetch(`${API}/api/identify`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Tanıma başarısız");
  }
  return json;
}

export async function health() {
  const res = await fetch(`${API}/api/health`);
  return res.json();
}
