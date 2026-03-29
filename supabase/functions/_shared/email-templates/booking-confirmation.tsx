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

interface BookingConfirmationEmailProps {
  customer_name: string;
  event_date: string;
  event_time?: string;
  event_end_time?: string;
  event_location: string;
  equipment: string[];
  special_requests?: string;
}

export const BookingConfirmationEmail = ({
  customer_name,
  event_date,
  event_time,
  event_end_time,
  event_location,
  equipment,
  special_requests,
}: BookingConfirmationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your booking request has been received!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/logo-1773269498760.png"
          width="48"
          height="48"
          alt="SIOTO"
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>Booking Received!</Heading>
        <Text style={text}>
          Hey {customer_name}! We've received your booking request and our team
          will review it shortly. Here's a summary:
        </Text>
        <Hr style={hr} />
        <Text style={detailLabel}>Date</Text>
        <Text style={detailValue}>{event_date}</Text>
        {event_time && (
          <>
            <Text style={detailLabel}>Time</Text>
            <Text style={detailValue}>
              {event_time}{event_end_time ? ` – ${event_end_time}` : ""}
            </Text>
          </>
        )}
        <Text style={detailLabel}>Location</Text>
        <Text style={detailValue}>{event_location}</Text>
        <Text style={detailLabel}>Equipment</Text>
        <Text style={detailValue}>{equipment.join(", ")}</Text>
        {special_requests && (
          <>
            <Text style={detailLabel}>Special Requests</Text>
            <Text style={detailValue}>{special_requests}</Text>
          </>
        )}
        <Hr style={hr} />
        <Text style={text}>
          We'll be in touch within 24 hours with confirmation and next steps.
          If you have questions, just reply to this email.
        </Text>
        <Text style={footer}>
          SIOTO Safety Hub · Keeping events safe and fun
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BookingConfirmationEmail;

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
