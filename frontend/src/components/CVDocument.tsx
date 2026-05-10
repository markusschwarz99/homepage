import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { CVProfile, CVExperience, CVLanguage, CVCertificate, CVEducation, ProjectReference } from '../types';

const C = {
  text: '#1A1A1A',
  muted: '#5A5A5A',
  border: '#2E2E2E',
  light: '#BFBFBD',
  bg: '#F2F2F2',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    backgroundColor: '#FFFFFF',
    color: C.text,
  },
  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    marginHorizontal: -52,
    marginTop: -48,
    paddingTop: 48,
  },
  name: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: C.border,
    marginBottom: 4,
  },
  birthdate: {
    fontSize: 9,
    color: C.muted,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: C.border,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 3,
    marginBottom: 10,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  expTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    flex: 1,
  },
  expDate: {
    fontSize: 8.5,
    color: C.muted,
    flexShrink: 0,
    marginLeft: 12,
  },
  expBlock: {
    marginBottom: 10,
  },
  bullets: {
    marginTop: 2,
    paddingLeft: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
  },
  bulletDot: {
    width: 10,
    fontSize: 8.5,
    color: C.muted,
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    color: C.muted,
    lineHeight: 1.4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 18,
  },
  col: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  rowLabel: {
    fontSize: 9.5,
  },
  rowValue: {
    fontSize: 9.5,
    color: C.muted,
  },
  eduRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 6,
  },
  eduDate: {
    fontSize: 8.5,
    color: C.muted,
    width: 68,
    flexShrink: 0,
    lineHeight: 1.4,
  },
  eduText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.4,
  },
  projectBlock: {
    marginBottom: 14,
  },
  projectMeta: {
    fontSize: 8.5,
    color: C.muted,
    marginTop: 2,
    marginBottom: 1,
  },
  projectTopic: {
    fontSize: 9.5,
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.light,
    marginBottom: 10,
    marginTop: 2,
  },
});

function fmtDate(iso: string | null): string {
  if (!iso) return 'aktuell';
  const [y, m] = iso.split('-');
  return `${m}/${y}`;
}

function fmtBirth(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function Bullets({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <View style={s.bullets}>
      {lines.map((line, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>·</Text>
          <Text style={s.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

interface Props {
  profile: CVProfile | null;
  experiences: CVExperience[];
  languages: CVLanguage[];
  certs: CVCertificate[];
  educations: CVEducation[];
  projects: ProjectReference[];
}

export function CVDocument({ profile, experiences, languages, certs, educations, projects }: Props) {
  const hasName = profile && (profile.vorname || profile.nachname);
  const hasBirth = profile?.geburtsdatum;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header strip */}
        <View style={s.header}>
          {hasName && (
            <Text style={s.name}>
              {[profile.vorname, profile.nachname].filter(Boolean).join(' ')}
            </Text>
          )}
          {hasBirth && (
            <Text style={s.birthdate}>* {fmtBirth(profile!.geburtsdatum!)}</Text>
          )}
        </View>

        {/* Berufliche Tätigkeiten */}
        {experiences.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Berufliche Tätigkeiten</Text>
            {experiences.map((exp) => (
              <View key={exp.id} style={s.expBlock}>
                <View style={s.expHeader}>
                  <Text style={s.expTitle}>{exp.rolle}</Text>
                  <Text style={s.expDate}>{fmtDate(exp.date_from)} – {fmtDate(exp.date_to)}</Text>
                </View>
                {exp.beschreibung ? <Bullets text={exp.beschreibung} /> : null}
              </View>
            ))}
          </View>
        )}

        {/* Sprachen + Zertifikate */}
        {(languages.length > 0 || certs.length > 0) && (
          <View style={s.twoCol}>
            {languages.length > 0 && (
              <View style={s.col}>
                <Text style={s.sectionTitle}>Sprachen</Text>
                {languages.map((lang) => (
                  <View key={lang.id} style={s.row}>
                    <Text style={s.rowLabel}>{lang.sprache}</Text>
                    <Text style={s.rowValue}>{lang.niveau}</Text>
                  </View>
                ))}
              </View>
            )}
            {certs.length > 0 && (
              <View style={s.col}>
                <Text style={s.sectionTitle}>Zertifikate</Text>
                {certs.map((cert) => (
                  <View key={cert.id} style={s.row}>
                    <Text style={s.rowLabel}>{cert.name}</Text>
                    <Text style={s.rowValue}>{String(cert.jahr)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Ausbildung & Studium */}
        {educations.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ausbildung & Studium</Text>
            {educations.map((edu) => (
              <View key={edu.id} style={s.eduRow}>
                <Text style={s.eduDate}>{fmtDate(edu.date_from)} – {fmtDate(edu.date_to)}</Text>
                <Text style={s.eduText}>{edu.beschreibung}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* Projektreferenzen — eigene Seite */}
      {projects.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.name}>Projektreferenzen</Text>
          </View>
          {projects.map((ref, idx) => (
            <View key={ref.id} style={s.projectBlock}>
              <View style={s.expHeader}>
                <Text style={s.expTitle}>{ref.title}</Text>
                <Text style={s.expDate}>{fmtDate(ref.date_from)} – {fmtDate(ref.date_to)}</Text>
              </View>
              <Text style={s.projectMeta}>
                {ref.industry} · {ref.fte} FTE · {ref.roles}
              </Text>
              <Text style={s.projectTopic}>{ref.topic}</Text>
              {ref.responsibilities ? <Bullets text={ref.responsibilities} /> : null}
              {idx < projects.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}
