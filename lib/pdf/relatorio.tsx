import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles, brl } from './styles';

export type RelatorioServico = { label: string; monthlyValue: number };
export type RelatorioPost = { caption: string | null; platform: string; status: string };

export function RelatorioMensalPDF({
  clientName,
  mesAno,
  services,
  totalPago,
  leads,
  spend,
  cpl,
  posts,
  date,
}: {
  clientName: string;
  mesAno: string;
  services: RelatorioServico[];
  totalPago: number;
  leads: number;
  spend: number;
  cpl: number | null;
  posts: RelatorioPost[];
  date: string;
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.brand}>MLX MIND</Text>
          <Text style={pdfStyles.muted}>{date}</Text>
        </View>

        <Text style={pdfStyles.title}>Relatório Mensal — {clientName}</Text>
        <Text style={{ ...pdfStyles.muted, marginBottom: 18 }}>Referente a {mesAno}</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Serviços contratados</Text>
          {services.length === 0 ? (
            <Text style={pdfStyles.muted}>Nenhum serviço ativo.</Text>
          ) : (
            services.map((s, i) => (
              <View style={pdfStyles.row} key={i}>
                <Text>{s.label}</Text>
                <Text>{brl(s.monthlyValue)}/mês</Text>
              </View>
            ))
          )}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Financeiro do mês</Text>
          <View style={pdfStyles.row}>
            <Text>Valor pago</Text>
            <Text>{brl(totalPago)}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Métricas (Meta Ads)</Text>
          <View style={pdfStyles.row}>
            <Text>Leads</Text>
            <Text>{leads}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>Investimento</Text>
            <Text>{brl(spend)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text>CPL</Text>
            <Text>{cpl != null ? brl(cpl) : '—'}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Posts do mês ({posts.length})</Text>
          {posts.length === 0 ? (
            <Text style={pdfStyles.muted}>Nenhum post agendado neste mês.</Text>
          ) : (
            posts.map((p, i) => (
              <View style={pdfStyles.row} key={i}>
                <Text>{p.caption ?? '(sem legenda)'}</Text>
                <Text>
                  {p.platform} · {p.status}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={pdfStyles.footer}>Relatório gerado por MLX Flow · mlxmind.com</Text>
      </Page>
    </Document>
  );
}
