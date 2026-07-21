import { useMemo, useState } from 'react';
import { api } from '../api';

function localAnswer(message, store, products) {
  const lowStock = products.filter((p) => (p.stock || 0) <= 5);
  const top = products
    .slice()
    .sort((a, b) => (b.stock || 0) - (a.stock || 0))
    .slice(0, 3)
    .map((p) => p.name)
    .join(', ');

  if (message.toLocaleLowerCase('tr').includes('reklam')) {
    return `${store?.name || 'Mağazan'} için bugün amber etiketli kısa bir kampanya paylaş: "${top || 'taze ürünler'} stokta, mahalle teslimatı hızlı." Reklam kutusunu işaretleyip feed'e düşürebilirsin.`;
  }
  if (message.toLocaleLowerCase('tr').includes('stok')) {
    return lowStock.length
      ? `Dikkat isteyen stoklar: ${lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}. Stok veya geliş tarihini güncelle.`
      : 'Stokların sağlıklı görünüyor. En çok bulunan ürünleri vitrine çıkarıp hızlı teslimat mesajı ekleyebilirsin.';
  }
  return `${store?.district || 'İstanbul'} çevresinde harita görünürlüğünü artırmak için net ürün adı, güncel stok ve kısa video/foto postu öneririm.`;
}

export default function ChatBot({ store, products = [] }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'hello',
      from: 'bot',
      text: 'Merhaba, stok, fiyat, reklam ve sipariş önceliği için hızlı öneri verebilirim.'
    }
  ]);

  const quickPrompts = useMemo(
    () => ['Azalan stokları özetle', 'Bugün hangi reklamı yayınlayayım?', 'Fiyat güncelleme önerisi ver'],
    []
  );

  const send = async (text = input) => {
    if (!text.trim()) return;
    const userMessage = { id: `u-${Date.now()}`, from: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setBusy(true);
    try {
      let answer;
      try {
        const data = await api.chatbot({
          message: userMessage.text,
          storeId: store?.id,
          store,
          products
        });
        answer = data.answer || data.message || data.reply;
      } catch (err) {
        if (err.status && err.status !== 404) throw err;
        answer = localAnswer(userMessage.text, store, products);
      }
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, from: 'bot', text: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, from: 'bot', text: err.message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`chatbot glass-panel ${open ? 'open' : 'collapsed'}`}>
      <button type="button" className="chatbot-toggle" onClick={() => setOpen((v) => !v)}>
        AI Kılavuz {open ? '−' : '+'}
      </button>
      {open && (
        <>
          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => send(prompt)} disabled={busy}>
                {prompt}
              </button>
            ))}
          </div>
          <form
            className="chatbot-form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="AI'a sor..." />
            <button type="submit" className="btn btn-accent btn-sm" disabled={busy}>
              Gönder
            </button>
          </form>
        </>
      )}
    </section>
  );
}
