import { ScrollView, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";
import { MEDICAL_DISCLAIMER } from "../constants/subscriptions";

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Gizlilik Politikası</Text>
      <Text style={styles.meta}>Son güncelleme: 22 Temmuz 2026</Text>

      <Text style={styles.p}>
        BalıkAtlas (“Uygulama”), yayıncı tarafından sunulur. Bu politika hangi
        verilerin işlendiğini açıklar.
      </Text>

      <Text style={styles.h2}>1. Toplanan veriler</Text>
      <Text style={styles.p}>
        İsteğe bağlı hesap: kullanıcı adı ve şifre (şifre hash’lenerek saklanır).
        Kamera / galeri: yalnızca AI tarama için, sizin başlatmanızla kullanılır;
        fotoğraflar tanıma isteği için işlenir, kalıcı pazarlama profili
        oluşturulmaz. Favoriler cihazda saklanabilir. Reklam kimliği veya takip
        SDK’sı kullanılmaz.
      </Text>

      <Text style={styles.h2}>2. Abonelik</Text>
      <Text style={styles.p}>
        Ödeme işlemleri Apple / Google tarafından yürütülür. Biz kart numarası
        toplamayız. Abonelik durumu hesabınıza bağlanabilir.
      </Text>

      <Text style={styles.h2}>3. Hesap silme</Text>
      <Text style={styles.p}>
        Hesap → Hesabı Sil ile hesabınızı ve sunucudaki ilişkili kayıtlarınızı
        silebilirsiniz.
      </Text>

      <Text style={styles.h2}>4. Çocuklar</Text>
      <Text style={styles.p}>
        13 yaş altından bilerek kişisel veri toplanmaz.
      </Text>

      <Text style={styles.h2}>5. Sağlık</Text>
      <Text style={styles.p}>{MEDICAL_DISCLAIMER}</Text>

      <Text style={styles.h2}>6. İletişim</Text>
      <Text style={styles.p}>kaygisizbaris9@gmail.com</Text>
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
});
