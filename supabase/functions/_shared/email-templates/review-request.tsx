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
  Button as EmailButton,
  Section,
} from "npm:@react-email/components@0.0.22";

interface ReviewRequestEmailProps {
  customer_name: string;
  company_name: string;
  event_date: string;
  event_title: string;
  products: string[];
  review_link: string;
}

export const ReviewRequestEmail = ({
  customer_name,
  company_name,
  event_date,
  event_title,
  products,
  review_link,
}: ReviewRequestEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>How was your event? We'd love your feedback!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/logo-1773269498760.png"
          width="48"
          height="48"
          alt={company_name}
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>Thank You, {customer_name}! 🎉</Heading>
        <Text style={text}>
          We hope you had an amazing time at your event! Your satisfaction means
          everything to us, and we'd love to hear how it went.
        </Text>
        <Hr style={hr} />

        <Text style={detailLabel}>Event</Text>
        <Text style={detailValue}>{event_title}</Text>

        <Text style={detailLabel}>Date</Text>
        <Text style={detailValue}>{event_date}</Text>

        {products && products.length > 0 && (
          <>
            <Text style={detailLabel}>Equipment Provided</Text>
            <Text style={detailValue}>{products.join(", ")}</Text>
          </>
        )}

        <Hr style={hr} />

        <Text style={text}>
          Would you mind taking a moment to share your experience? Your review
          helps other families find us and lets our team know what we're doing
          right!
        </Text>

        <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
          <EmailButton
            href={review_link}
            style={button}
          >
            ⭐ Leave a Review
          </EmailButton>
        </Section>

        <Text style={smallText}>
          If the button doesn't work, copy and paste this link into your browser:{" "}
          <a href={review_link} style={{ color: "#1a73e8" }}>{review_link}</a>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          {company_name} · Thank you for choosing us!
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReviewRequestEmail;

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
const smallText = { fontSize: "12px", color: "hsl(0, 0%, 55%)", lineHeight: "1.6", margin: "0 0 20px", wordBreak: "break-all" as const };
const detailLabel = { fontSize: "12px", color: "hsl(0, 0%, 40%)", margin: "0 0 2px", fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" };
const detailValue = { fontSize: "14px", color: "hsl(0, 0%, 8%)", margin: "0 0 14px" };
const hr = { borderColor: "hsl(0, 0%, 88%)", margin: "20px 0" };
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
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
