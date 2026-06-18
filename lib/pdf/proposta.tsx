import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles, brl } from './styles';

export type PropostaServico = { service: string; value: number };

export function PropostaPDF({
  companyName,
  contactName,
  services,
  planValue,
  date,
}: {
  companyName: string;
  contactName: string | null;
  services: PropostaServico[];
  planValue: number;
  date: string;
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.brand}>MLX MIND</Text>
          <Text style={pdfStyles.muted}>{date}</Text>
        </View>

        <Text style={pdfStyles.title}>Proposta Comercial</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Empresa</Text>
          <Text style={pdfStyles.value}>{companyName}</Text>
          {contactName && (
            <>
              <Text style={pdfStyles.label}>Contato</Text>
              <Text style={pdfStyles.value}>{contactName}</Text>
            </>
          )}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Serviços propostos</Text>
          {services.map((s, i) => (
            <View style={pdfStyles.row} key={i}>
              <Text>{s.service}</Text>
              <Text>{brl(s.value)}/mês</Text>
            </View>
          ))}
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalLabel}>Valor do plano</Text>
            <Text style={pdfStyles.totalValue}>{brl(planValue)}/mês</Text>
          </View>
        </View>

        <Text style={pdfStyles.footer}>Proposta gerada por MLX Flow · mlxmind.com</Text>
      </Page>
    </Document>
  );
}
