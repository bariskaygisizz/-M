import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchAbout } from '../../lib/api';

export default function AboutScreen() {
  const [about, setAbout] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAbout()
      .then(setAbout)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <View style={styles.root}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!about) {
    return (
      <View style={styles.root}>
        <Text style={styles.meta}>Yükleniyor…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={styles.title}>{about.name}</Text>
      <Text style={styles.body}>{about.purpose}</Text>

      <Text style={styles.h}>Kimler kullanır?</Text>
      {about.whoUses.map((item) => (
        <Text key={item} style={styles.li}>
          • {item}
        </Text>
      ))}

      <Text style={styles.h}>Sen ne kazanırsın?</Text>
      {about.whatYouGain.map((item) => (
        <Text key={item} style={styles.li}>
          • {item}
        </Text>
      ))}

      <Text style={styles.h}>Para / ücretsiz yayın</Text>
      <Text style={styles.body}>
        Ücretsiz yayınlarsan: portföy, kullanıcı, geri bildirim ve açık kaynak itibarı kazanırsın.
        Para için: reklam, Pro abonelik (uyarılar, geçmiş, favori rotalar), sponsorluk veya B2B
        (havaalanı çevresi / emlak farkındalığı) düşünülebilir. Yolcu verisi satılamaz — yoktur.
      </Text>

      <Text style={styles.warn}>{about.passengers}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071018' },
  title: { color: '#e8f1f8', fontSize: 24, fontWeight: '800' },
  h: { color: '#ffd166', fontSize: 16, fontWeight: '700', marginTop: 10 },
  body: { color: '#d5e4f0', lineHeight: 22 },
  li: { color: '#d5e4f0', lineHeight: 22 },
  meta: { color: '#8aa0b5', padding: 16 },
  warn: {
    marginTop: 8,
    color: '#f3e2b0',
    backgroundColor: 'rgba(255,209,102,0.08)',
    borderColor: 'rgba(255,209,102,0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    lineHeight: 20
  },
  error: { color: '#ffc9c0', padding: 16 }
});
