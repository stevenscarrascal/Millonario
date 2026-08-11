import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  border: { flex: 1, borderWidth: 3, borderColor: "#f2ae32", padding: 40, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: "#8190b6", marginBottom: 18 },
  title: { fontSize: 28, color: "#0b1533", marginBottom: 6, textAlign: "center" },
  name: { fontSize: 22, color: "#0b1533", marginTop: 22, marginBottom: 4, textAlign: "center" },
  org: { fontSize: 12, color: "#4c6683", marginBottom: 22, textAlign: "center" },
  result: { fontSize: 14, color: "#8f6a12", marginBottom: 30, textAlign: "center" },
  date: { fontSize: 10, color: "#4c6683", marginBottom: 4 },
  code: { fontSize: 8, color: "#8190b6", position: "absolute", bottom: 24, right: 40 },
});

export type CertificateData = {
  participantId: string;
  participantName: string;
  organizationName: string;
  level: string;
  winningsPoints: number;
  finishedAt: Date;
};

export function CertificateDocument({ data }: { data: CertificateData }) {
  const formattedDate = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(data.finishedAt);
  const formattedPoints = new Intl.NumberFormat("es-CO").format(data.winningsPoints);
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.eyebrow}>CERTIFICADO DE PARTICIPACIÓN</Text>
          <Text style={styles.title}>El Reto Internacional de Cumplimiento</Text>
          <Text style={styles.name}>{data.participantName}</Text>
          <Text style={styles.org}>{data.organizationName}</Text>
          <Text style={styles.result}>Nivel alcanzado: {data.level} · {formattedPoints} puntos</Text>
          <Text style={styles.date}>Finalizado el {formattedDate}</Text>
          <Text style={styles.code}>Código de verificación: {data.participantId}</Text>
        </View>
      </Page>
    </Document>
  );
}
