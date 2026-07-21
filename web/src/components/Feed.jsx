import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatDate, STORE_TYPE_LABELS } from '../api';
import { useAuth } from '../auth';

const POST_KEY = 'ym_posts';

const MEDIA = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80'
];

function readLocalPosts() {
  try {
    return JSON.parse(localStorage.getItem(POST_KEY) || '[]');
  } catch {
    return [];
  }
}

function makeDemoPosts(stores) {
  return stores.slice(0, 6).map((store, index) => ({
    id: `demo-post-${store.id}`,
    storeId: store.id,
    sellerId: store.ownerId,
    storeName: store.name,
    storeType: store.type,
    district: store.district,
    caption:
      index % 2 === 0
        ? `${store.district} için taze stok yenilendi. Haritadan ETA bakıp hemen sepet yapabilirsin.`
        : `Mahalle teslimatı aktif. Bugünün öne çıkan ürünlerinde hızlı çıkış var.`,
    mediaUrl: MEDIA[index % MEDIA.length],
    mediaType: 'photo',
    ad: index === 1 || index === 4,
    likes: 12 + index * 7,
    comments: index === 0 ? [{ id: 'c-demo', userName: 'Deniz', text: 'Stok bilgisi çok iyi oldu.' }] : [],
    createdAt: new Date(Date.now() - index * 1000 * 60 * 42).toISOString()
  }));
}

export default function Feed() {
  const { isAuthenticated, user, openAuthModal } = useAuth();
  const [posts, setPosts] = useState([]);
  const [commentDraft, setCommentDraft] = useState({});
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.t);
    showToast.t = window.setTimeout(() => setToast(''), 2500);
  };

  const load = useCallback(async () => {
    try {
      let remote = [];
      try {
        const res = await api.posts();
        remote = res.posts || [];
      } catch (err) {
        if (err.status && err.status !== 404) throw err;
      }
      const storeRes = await api.stores({ radiusKm: 50 });
      setPosts([...readLocalPosts(), ...remote, ...makeDemoPosts(storeRes.stores || [])]);
    } catch {
      setPosts(readLocalPosts());
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('ym_posts_changed', load);
    return () => window.removeEventListener('ym_posts_changed', load);
  }, [load]);

  const sortedPosts = useMemo(
    () => posts.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [posts]
  );

  const like = async (postId) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post)));
    try {
      await api.likePost(postId);
    } catch {
      /* local optimistic like */
    }
  };

  const comment = async (post) => {
    if (!isAuthenticated) {
      openAuthModal('customer', { mode: 'login' });
      return;
    }
    const text = (commentDraft[post.id] || '').trim();
    if (!text) return;
    const nextComment = {
      id: `comment-${Date.now()}`,
      userName: user?.name || 'YakınMarket kullanıcısı',
      text
    };
    setPosts((prev) =>
      prev.map((item) => (item.id === post.id ? { ...item, comments: [...(item.comments || []), nextComment] } : item))
    );
    setCommentDraft((prev) => ({ ...prev, [post.id]: '' }));
    try {
      await api.createComment(post.id, { text });
    } catch {
      /* comments remain local in demo mode */
    }
  };

  const messageSeller = async (post) => {
    if (!isAuthenticated) {
      openAuthModal('customer', { mode: 'login' });
      return;
    }
    try {
      await api.messages({ storeId: post.storeId, sellerId: post.sellerId, text: `${post.storeName} postu hakkında yazıyorum.` });
    } catch {
      /* demo message */
    }
    showToast('Satıcıya mesaj isteği gönderildi.');
  };

  return (
    <div className="feed-screen">
      <div className="feed-bg" aria-hidden="true" />
      <header className="feed-header glass-panel">
        <div>
          <p className="eyebrow">Keşfet</p>
          <h2>Mahalle mağazalarından canlı akış</h2>
        </div>
        <span>{isAuthenticated ? `${user.name} olarak bağlı` : 'Misafir: yorum/mesaj için giriş gerekir'}</span>
      </header>
      {toast && <div className="feed-toast glass-panel">{toast}</div>}

      <main className="feed-list" aria-label="YakınMarket feed">
        {sortedPosts.map((post) => (
          <article key={post.id} className="feed-card glass-panel">
            <div className="feed-card-head">
              <div>
                <strong>{post.storeName}</strong>
                <small>
                  {STORE_TYPE_LABELS[post.storeType] || 'Mağaza'} · {post.district} · {formatDate(post.createdAt)}
                </small>
              </div>
              {post.ad && <span className="ad-badge">Reklam</span>}
            </div>

            <div className={`feed-media ${post.mediaType === 'video' ? 'video' : ''}`}>
              {post.mediaUrl ? (
                post.mediaType === 'video' ? (
                  <video src={post.mediaUrl} controls playsInline />
                ) : (
                  <img src={post.mediaUrl} alt={`${post.storeName} paylaşımı`} />
                )
              ) : (
                <div className="media-fallback">
                  <span>{post.storeName}</span>
                </div>
              )}
            </div>

            <p className="feed-caption">{post.caption}</p>
            <div className="feed-actions">
              <button type="button" onClick={() => like(post.id)}>
                Beğen · {post.likes || 0}
              </button>
              <button type="button" onClick={() => messageSeller(post)}>
                Mesaj
              </button>
            </div>

            <div className="comment-list">
              {(post.comments || []).slice(-3).map((commentItem) => (
                <p key={commentItem.id}>
                  <strong>{commentItem.userName}</strong> {commentItem.text}
                </p>
              ))}
            </div>

            <form
              className="comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                comment(post);
              }}
            >
              <input
                value={commentDraft[post.id] || ''}
                onChange={(e) => setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))}
                placeholder="Yorum yap..."
              />
              <button type="submit">Yorum yap</button>
            </form>
          </article>
        ))}
      </main>
    </div>
  );
}
