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
} from "npm:@react-email/components@0.0.22";

interface ContractSignedEmailProps {
  customer_name: string;
  company_name: string;
  event_title: string;
  event_date: string;
  signed_at: string;
}

export const ContractSignedEmail = ({
  customer_name,
  company_name,
  event_title,
  event_date,
  signed_at,
}: ContractSignedEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Contract signed for {event_title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/email-logo.png"
          width="48"
          height="48"
          alt={company_name}
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>Contract Signed ✓</Heading>
        <Text style={text}>
          Hey {customer_name}! Your contract has been successfully signed.
          Here's a confirmation of the details:
        </Text>
        <Hr style={hr} />

        <Text style={detailLabel}>Event</Text>
        <Text style={detailValue}>{event_title}</Text>

        <Text style={detailLabel}>Event Date</Text>
        <Text style={detailValue}>{event_date}</Text>

        <Text style={detailLabel}>Signed At</Text>
        <Text style={detailValue}>{signed_at}</Text>

        <Hr style={hr} />

        <Section style={confirmBox}>
          <Text style={confirmText}>✓ Contract is now binding and on file</Text>
        </Section>

        <Hr style={hr} />
        <Text style={text}>
          If you have any questions about your contract or upcoming event,
          just reply to this email or contact us directly.
        </Text>
        <Text style={footer}>
          {company_name} · Professional event rentals
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ContractSignedEmail;

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
const confirmBox = { backgroundColor: "#D1FAE5", borderRadius: "8px", padding: "16px", margin: "0 0 20px" };
const confirmText = { fontSize: "14px", color: "#065F46", fontWeight: "600" as const, margin: "0" };
const hr = { borderColor: "hsl(0, 0%, 88%)", margin: "20px 0" };
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
