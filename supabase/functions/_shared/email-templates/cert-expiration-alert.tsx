/// <reference types="npm:@types/react@18.3.1" />

import * as React from "npm:react@18.3.1";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
  Section,
} from "npm:@react-email/components@0.0.22";

interface CertExpirationAlertEmailProps {
  company_name: string;
  expiring_certs: Array<{
    employee_name: string;
    certification_name: string;
    expiration_date: string;
    days_remaining: number;
    is_expired: boolean;
  }>;
  total_count: number;
}

export const CertExpirationAlertEmail = ({
  company_name = "Your Company",
  expiring_certs = [],
  total_count = 0,
}: CertExpirationAlertEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>⚠️ {total_count} employee certification(s) expiring soon</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", margin: "0", padding: "0" }}>
        <Container style={{ maxWidth: "580px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ fontSize: "22px", fontWeight: "700", color: "#1a1a1a", marginBottom: "8px" }}>
            Certification Expiration Alert
          </Heading>
          <Text style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
            {total_count} employee certification{total_count > 1 ? "s" : ""} at <strong>{company_name}</strong> {total_count > 1 ? "are" : "is"} expiring within 30 days or already expired.
          </Text>

          <Hr style={{ borderColor: "#e5e5e5", margin: "16px 0" }} />

          {expiring_certs.map((cert, i) => (
            <Section key={i} style={{ padding: "12px 16px", marginBottom: "8px", backgroundColor: cert.is_expired ? "#fef2f2" : "#fffbeb", borderRadius: "8px", border: `1px solid ${cert.is_expired ? "#fecaca" : "#fde68a"}` }}>
              <Text style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>
                {cert.employee_name}
              </Text>
              <Text style={{ fontSize: "13px", color: "#666", margin: "0 0 4px 0" }}>
                {cert.certification_name}
              </Text>
              <Text style={{ fontSize: "12px", fontWeight: "600", color: cert.is_expired ? "#dc2626" : "#d97706", margin: "0" }}>
                {cert.is_expired ? `Expired on ${cert.expiration_date}` : `Expires on ${cert.expiration_date} (${cert.days_remaining} days remaining)`}
              </Text>
            </Section>
          ))}

          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0 16px 0" }} />

          <Text style={{ fontSize: "13px", color: "#999", textAlign: "center" as const }}>
            Please review and renew these certifications to maintain compliance.
          </Text>

          <Text style={{ fontSize: "11px", color: "#bbb", textAlign: "center" as const, marginTop: "32px" }}>
            SIOTO — Compliance Management
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
