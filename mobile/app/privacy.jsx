import { ScrollView, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Gizlilik Politikası</Text>
      <Text style={styles.meta}>Son güncelleme: 20 Temmuz 2026</Text>

      <Text style={styles.p}>
        BalıkAtlas (“Uygulama”), Barış Kaygısız tarafından yayınlanır. Bu
        politika, uygulamanın hangi verileri işlediğini açıklar.
      </Text>

      <Text style={styles.h2}>1. Toplanan veriler</Text>
      <Text style={styles.p}>
        Uygulama hesap oluşturmaz, konum, kamera, mikrofon, rehber veya
        fotoğraf erişimi istemez. Reklam veya analitik SDK’sı kullanılmaz.
        Apple’ın App Tracking Transparency çerçevesi kapsamında takip yapılmaz.
      </Text>

      <Text style={styles.h2}>2. Cihazda saklanan veriler</Text>
      <Text style={styles.p}>
        Favori balık listesi yalnızca cihazınızda (AsyncStorage) saklanır.
        Bu veri sunucuya gönderilmez. Uygulamayı silerseniz bu veri silinir.
      </Text>

      <Text style={styles.h2}>3. İnternet kullanımı</Text>
      <Text style={styles.p}>
        Balık içerikleri uygulamaya gömülüdür ve çevrimdışı çalışır. Paylaşım
        veya e-posta bağlantısı gibi sistem özellikleri, kullandığınızda
        cihazınızın ilgili uygulamalarına yönlendirir.
      </Text>

      <Text style={styles.h2}>4. Çocuklar</Text>
      <Text style={styles.p}>
        Uygulama her yaş için uygundur (bilgi amaçlı). 13 yaş altı kullanıcılardan
        bilerek kişisel veri toplanmaz.
      </Text>

      <Text style={styles.h2}>5. Sağlık bilgisi uyarısı</Text>
      <Text style={styles.p}>
        Besin değerleri, fayda ve zarar maddeleri genel bilgilendirmedir; tıbbi
        tavsiye değildir.
      </Text>

      <Text style={styles.h2}>6. İletişim</Text>
      <Text style={styles.p}>
        Gizlilik soruları için: kaygisizbaris9@gmail.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.brand, marginBottom: 6 },
  meta: { color: colors.muted, marginBottom: 16, fontSize: 13 },
  h2: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 14,
    marginBottom: 6,
  },
  p: { color: colors.ink, fontSize: 14, lineHeight: 21 },
});
