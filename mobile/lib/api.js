const DEFAULT = "http://localhost:3001";

function base() {
  return (process.env.EXPO_PUBLIC_API_URL || DEFAULT).replace(/\/$/, "");
}

export async function fetchFish({ q = "", region = "Tümü" } = {}) {
  const params = new URLSearchParams({ q, region });
  const res = await fetch(`${base()}/api/fish?${params}`);
  if (!res.ok) throw new Error("Liste alınamadı");
  return res.json();
}

export async function identifyImage(uri) {
  const form = new FormData();
  form.append("image", {
    uri,
    name: "scan.jpg",
    type: "image/jpeg",
  });
  const res = await fetch(`${base()}/api/identify`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Tanıma başarısız");
  return json;
}
