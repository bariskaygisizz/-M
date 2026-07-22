import { ScrollView, Text, StyleSheet, Linking, Pressable } from "react-native";
import { MEDICAL_DISCLAIMER } from "../constants/subscriptions";

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Kullanım Koşulları (EULA)</Text>
      <Text style={styles.meta}>Son güncelleme: 22 Temmuz 2026</Text>

      <Text style={styles.h2}>1. Hizmet</Text>
      <Text style={styles.p}>
        BalıkAtlas; balık türleri, bölge, sezon, besin ve genel bilgilendirme
        içerikleri sunan bir mobil uygulamadır. AI tarama tahmine dayalıdır ve
        kesin tür teşhisi garantisi vermez.
      </Text>

      <Text style={styles.h2}>2. Hesap</Text>
      <Text style={styles.p}>
        Hesap oluşturmak isteğe bağlıdır. Doğru bilgi vermek sizin
        sorumluluğunuzdadır. Hesabınızı uygulama içinden silebilirsiniz.
      </Text>

      <Text style={styles.h2}>3. Abonelikler</Text>
      <Text style={styles.p}>
        Premium abonelikler yalnızca Apple App Store / Google Play uygulama içi
        satın alma (IAP) ile sunulur. Ödeme ilgili mağaza hesabınızdan tahsil
        edilir. Abonelik otomatik yenilenir; iptal işlemi mağaza hesap
        ayarlarından yapılır. Satın alımları geri yükleme desteklenir.
      </Text>

      <Text style={styles.h2}>4. Sağlık bilgisi</Text>
      <Text style={styles.p}>{MEDICAL_DISCLAIMER}</Text>

      <Text style={styles.h2}>5. Kabul edilemez kullanım</Text>
      <Text style={styles.p}>
        Hizmeti tersine mühendislik, kötüye kullanım, yasa dışı içerik veya
        başkalarının haklarını ihlal için kullanamazsınız.
      </Text>

      <Text style={styles.h2}>6. Sorumluluk sınırı</Text>
      <Text style={styles.p}>
        Uygulama “olduğu gibi” sunulur. Dolaylı zararlardan, veri kaybından veya
        AI tahmin hatalarından doğan sonuçlardan mümkün olan en geniş ölçüde
        sorumlu tutulmayız.
      </Text>

      <Text style={styles.h2}>7. İletişim</Text>
      <Pressable onPress={() => Linking.openURL("mailto:kaygisizbaris9@gmail.com")}>
        <Text style={styles.link}>kaygisizbaris9@gmail.com</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, backgroundColor: "#0a0a0a" },
  h1: { fontSize: 24, fontWeight: "800", color: "#2edcc8", marginBottom: 6 },
  meta: { color: "#8a9aa0", marginBottom: 16, fontSize: 13 },
  h2: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginTop: 14,
    marginBottom: 6,
  },
  p: { color: "#e8eef0", fontSize: 14, lineHeight: 21 },
  link: { color: "#2edcc8", fontWeight: "700", marginTop: 4 },
});
