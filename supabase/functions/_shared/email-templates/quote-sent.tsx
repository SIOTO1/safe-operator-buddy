/// <reference types="npm:@types/react@18.3.1" />

import * as React from "npm:react@18.3.1";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
  Hr,
  Section,
  Button as EmailButton,
} from "npm:@react-email/components@0.0.22";

interface QuoteSentEmailProps {
  customer_name: string;
  company_name: string;
  quote_title: string;
  total_amount: number;
  items: { name: string; quantity: number; unit_price: number }[];
  portal_link?: string;
}

export const QuoteSentEmail = ({
  customer_name,
  company_name,
  quote_title,
  total_amount,
  items,
  portal_link,
}: QuoteSentEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New quote from {company_name} — ${total_amount.toFixed(2)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/email-logo.png"
          width="48"
          height="48"
          alt={company_name}
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>Your Quote is Ready</Heading>
        <Text style={text}>
          Hey {customer_name}! {company_name} has prepared a quote for you.
          Please review the details below.
        </Text>
        <Hr style={hr} />

        <Text style={detailLabel}>Quote</Text>
        <Text style={detailValue}>{quote_title}</Text>

        {items && items.length > 0 && (
          <>
            <Text style={detailLabel}>Items</Text>
            {items.map((item, i) => (
              <Text key={i} style={itemLine}>
                {item.name} × {item.quantity} — ${(item.unit_price * item.quantity).toFixed(2)}
              </Text>
            ))}
          </>
        )}

        <Hr style={hr} />

        <Section style={totalBox}>
          <Text style={totalLabel}>Total Amount</Text>
          <Text style={totalAmount}>${total_amount.toFixed(2)}</Text>
        </Section>

        {portal_link && (
          <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
            <EmailButton href={portal_link} style={button}>
              View Quote & Accept
            </EmailButton>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={text}>
          If you have questions about this quote, just reply to this email or
          contact us directly. We look forward to working with you!
        </Text>
        <Text style={footer}>
          {company_name} · Professional event rentals
        </Text>
      </Container>
    </Body>
  </Html>
);

export default QuoteSentEmail;

const main = { backgroundColor: "#ffffff", fontFamily: "'Inter', 'Space Grotesk', Arial, sans-serif" };
const container = { padding: "32px 28px" };
const h1 = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  fontFamily: "'Space Grotesk', Arial, sans-serif",
  color: "hsl(0, 0%, 8%)",
  margin: "0 0 20px",
};
const text = { fontSize: "14px", color: "hsl(0, 0%, 40%)", lineHeight: "1.6", margin: "0 0 20px" };
const detailLabel = { fontSize: "12px", color: "hsl(0, 0%, 40%)", margin: "0 0 2px", fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" };
const detailValue = { fontSize: "14px", color: "hsl(0, 0%, 8%)", margin: "0 0 14px" };
const itemLine = { fontSize: "14px", color: "hsl(0, 0%, 8%)", margin: "0 0 6px", paddingLeft: "8px" };
const totalBox = { backgroundColor: "#F0FDF4", borderRadius: "8px", padding: "16px", margin: "0 0 20px" };
const totalLabel = { fontSize: "12px", color: "#065F46", margin: "0 0 4px", fontWeight: "600" as const, textTransform: "uppercase" as const };
const totalAmount = { fontSize: "28px", color: "#065F46", fontWeight: "bold" as const, margin: "0" };
const button = {
  backgroundColor: "hsl(0, 0%, 8%)",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  display: "inline-block" as const,
};
const hr = { borderColor: "hsl(0, 0%, 88%)", margin: "20px 0" };
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
