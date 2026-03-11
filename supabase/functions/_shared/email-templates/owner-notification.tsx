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
} from "npm:@react-email/components@0.0.22";

interface OwnerNotificationEmailProps {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  event_date: string;
  event_time?: string;
  event_location: string;
  equipment: string[];
  special_requests?: string;
  guest_count?: number;
}

export const OwnerNotificationEmail = ({
  customer_name,
  customer_email,
  customer_phone,
  event_date,
  event_time,
  event_location,
  equipment,
  special_requests,
  guest_count,
}: OwnerNotificationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New booking request from {customer_name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/email-logo.png"
          width="48"
          height="48"
          alt="SIOTO"
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>New Booking Request</Heading>
        <Text style={text}>
          A new booking request has been submitted and is awaiting your review.
        </Text>
        <Hr style={hr} />
        <Text style={detailLabel}>Customer</Text>
        <Text style={detailValue}>{customer_name}</Text>
        <Text style={detailLabel}>Email</Text>
        <Text style={detailValue}>{customer_email}</Text>
        {customer_phone && (
          <>
            <Text style={detailLabel}>Phone</Text>
            <Text style={detailValue}>{customer_phone}</Text>
          </>
        )}
        <Text style={detailLabel}>Date</Text>
        <Text style={detailValue}>{event_date}{event_time ? ` at ${event_time}` : ""}</Text>
        <Text style={detailLabel}>Location</Text>
        <Text style={detailValue}>{event_location}</Text>
        <Text style={detailLabel}>Equipment</Text>
        <Text style={detailValue}>{equipment.join(", ")}</Text>
        {guest_count && (
          <>
            <Text style={detailLabel}>Guest Count</Text>
            <Text style={detailValue}>{guest_count}</Text>
          </>
        )}
        {special_requests && (
          <>
            <Text style={detailLabel}>Special Requests</Text>
            <Text style={detailValue}>{special_requests}</Text>
          </>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Log in to your dashboard to review and respond to this booking.
        </Text>
        <Text style={footer}>
          SIOTO Safety Hub · Automated notification
        </Text>
      </Container>
    </Body>
  </Html>
);

export default OwnerNotificationEmail;

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
const hr = { borderColor: "hsl(0, 0%, 88%)", margin: "20px 0" };
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
