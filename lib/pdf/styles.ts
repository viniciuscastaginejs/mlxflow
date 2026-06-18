import { StyleSheet } from '@react-pdf/renderer';

export const brl = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

export const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#1d1830' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#7c3aed',
    borderBottomStyle: 'solid',
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#7c3aed' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: '#716b85', fontSize: 10 },
  section: { marginBottom: 18 },
  label: { fontSize: 9, color: '#716b85', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 12, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e4f0',
    borderBottomStyle: 'solid',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, marginTop: 6 },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#7c3aed' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#a79fc0', textAlign: 'center' },
});
