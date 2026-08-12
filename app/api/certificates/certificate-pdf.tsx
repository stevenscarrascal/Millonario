import { Document, Image, Page, StyleSheet, Svg, Path, Circle, Text, View } from "@react-pdf/renderer";

const NAVY = "#0b1533";
const BLUE = "#1d3a7a";
const GOLD = "#c9922a";
const GOLD_LIGHT = "#f2ae32";
const MUTED = "#5c6b8f";

// @react-pdf/image mistakes an absolute Windows path (e.g. "C:\...") for a URL
// scheme ("C:") and silently falls back to a failed fetch() instead of reading
// the file, so this must stay a cwd-relative path.
const LOGO_PATH = "public/logo 400x400 black.png";

const styles = StyleSheet.create({
  page: { padding: 22, backgroundColor: "#fbfaf6", fontFamily: "Times-Roman" },
  outerBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: NAVY,
    padding: 6,
  },
  innerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 20,
    paddingHorizontal: 56,
    alignItems: "center",
  },
  cornerTL: { position: "absolute", top: -1, left: -1 },
  cornerTR: { position: "absolute", top: -1, right: -1, transform: "scale(-1, 1)" },
  cornerBL: { position: "absolute", bottom: -1, left: -1, transform: "scale(1, -1)" },
  cornerBR: { position: "absolute", bottom: -1, right: -1, transform: "scale(-1, -1)" },

  logo: { width: 100, height: 100, marginBottom: 8 },
  eyebrow: { fontFamily: "Helvetica", fontSize: 12, letterSpacing: 4, color: GOLD, marginBottom: 8 },
  title: { fontFamily: "Times-Bold", fontSize: 30, color: NAVY, textAlign: "center" },
  subtitle: { fontFamily: "Helvetica", fontSize: 8, letterSpacing: 2, color: MUTED, marginTop: 6 },

  divider: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 12 },
  dividerLine: { width: 70, height: 1, backgroundColor: "#d8cba6" },
  dividerMark: { width: 6, height: 6, marginHorizontal: 10, backgroundColor: GOLD, transform: "rotate(45deg)" },

  grantedTo: { fontFamily: "Helvetica", fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 8 },
  name: { fontFamily: "Times-Bold", fontSize: 26, color: NAVY, textAlign: "center" },
  nameUnderline: { width: 220, height: 1.5, backgroundColor: GOLD_LIGHT, marginTop: 6, marginBottom: 10 },
  org: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: BLUE, letterSpacing: 0.5, marginBottom: 12 },

  body: { fontFamily: "Times-Roman", fontSize: 11, color: "#2c3550", textAlign: "center", lineHeight: 1.5, maxWidth: 430 },
  bodyHighlight: { fontFamily: "Times-Bold", color: NAVY },

  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  badge: { borderWidth: 1, borderColor: GOLD, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 16, alignItems: "center" },
  badgeLabel: { fontFamily: "Helvetica", fontSize: 6.5, letterSpacing: 1.5, color: MUTED, marginBottom: 3 },
  badgeValue: { fontFamily: "Times-Bold", fontSize: 11, color: NAVY },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", width: "100%", marginTop: 18 },
  footerCol: { alignItems: "center", width: 170 },
  footerLine: { width: 150, height: 1, backgroundColor: "#9aa4c2", marginBottom: 5 },
  footerLabel: { fontFamily: "Helvetica", fontSize: 7.5, letterSpacing: 1, color: MUTED },
  footerValue: { fontFamily: "Times-Bold", fontSize: 10, color: NAVY, marginBottom: 5 },

  seal: { alignItems: "center", justifyContent: "center", width: 62, height: 62 },
  sealLabel: { fontFamily: "Helvetica-Bold", fontSize: 5.5, letterSpacing: 1, color: NAVY, marginTop: -46 },

  code: { position: "absolute", bottom: 10, alignSelf: "center", fontFamily: "Helvetica", fontSize: 7, color: "#8b93ab", letterSpacing: 0.5 },
});

function CornerFlourish() {
  return (
    <Svg width="34" height="34" viewBox="0 0 34 34">
      <Path d="M2 2 H16 M2 2 V16" stroke={GOLD} strokeWidth={1.5} fill="none" />
      <Circle cx="2" cy="2" r="2.4" fill={GOLD} />
    </Svg>
  );
}

function Seal() {
  return (
    <Svg width="62" height="62" viewBox="0 0 62 62">
      <Circle cx="31" cy="31" r="24" fill="none" stroke={GOLD} strokeWidth={1.5} />
      <Circle cx="31" cy="31" r="20" fill="none" stroke={GOLD} strokeWidth={0.75} />
      <Path
        d="M31 13 L33.5 22 L43 22.4 L35.5 28 L38.4 37 L31 31.5 L23.6 37 L26.5 28 L19 22.4 L28.5 22 Z"
        fill={GOLD_LIGHT}
        stroke={GOLD}
        strokeWidth={0.5}
      />
      <Path
        d="M16 48 L22.5 40 L25 43 L18.5 51 Z M46 48 L39.5 40 L37 43 L43.5 51 Z"
        fill={NAVY}
      />
    </Svg>
  );
}

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
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <View style={[styles.cornerTL]}><CornerFlourish /></View>
            <View style={[styles.cornerTR]}><CornerFlourish /></View>
            <View style={[styles.cornerBL]}><CornerFlourish /></View>
            <View style={[styles.cornerBR]}><CornerFlourish /></View>

            <Image src={LOGO_PATH} style={styles.logo} />
            <Text style={styles.eyebrow}>CERTIFICADO DE PARTICIPACIÓN</Text>
            <Text style={styles.title}>El Reto Internacional de Cumplimiento</Text>
            <Text style={styles.subtitle}>PROGRAMA DE FORMACIÓN GAMIFICADA EN COMPLIANCE</Text>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerMark} />
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.grantedTo}>SE OTORGA EL PRESENTE CERTIFICADO A</Text>
            <Text style={styles.name}>{data.participantName}</Text>
            <View style={styles.nameUnderline} />
            <Text style={styles.org}>{data.organizationName}</Text>

            <Text style={styles.body}>
              por haber completado satisfactoriamente el reto de conocimientos en cumplimiento
              normativo, demostrando dominio progresivo a través de sus distintos niveles de
              dificultad y alcanzando una calificación destacada en el proceso.
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>NIVEL ALCANZADO</Text>
                <Text style={styles.badgeValue}>{data.level}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>PUNTAJE FINAL</Text>
                <Text style={styles.badgeValue}>{formattedPoints} pts</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerCol}>
                <Text style={styles.footerValue}>{formattedDate}</Text>
                <View style={styles.footerLine} />
                <Text style={styles.footerLabel}>FECHA DE FINALIZACIÓN</Text>
              </View>

              <View style={styles.seal}>
                <Seal />
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerValue}>El Reto Internacional</Text>
                <View style={styles.footerLine} />
                <Text style={styles.footerLabel}>DIRECCIÓN DEL PROGRAMA</Text>
              </View>
            </View>

            <Text style={styles.code}>Código de verificación: {data.participantId}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
