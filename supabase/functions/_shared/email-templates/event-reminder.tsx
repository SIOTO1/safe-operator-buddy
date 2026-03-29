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

interface EventReminderEmailProps {
  customer_name: string;
  event_date: string;
  event_time?: string;
  event_end_time?: string;
  location: string;
  products: string[];
  remaining_balance: number;
  reminder_type: "3_day" | "1_day" | "morning";
}

const reminderText: Record<string, string> = {
  "3_day": "Your event is coming up in 3 days!",
  "1_day": "Your event is tomorrow!",
  "morning": "Your event is today!",
};

export const EventReminderEmail = ({
  customer_name,
  event_date,
  event_time,
  event_end_time,
  location,
  products,
  remaining_balance,
  reminder_type,
}: EventReminderEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{reminderText[reminder_type] || "Event Reminder"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/logo-1773269498760.png"
          width="48"
          height="48"
          alt="SIOTO"
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>
          {reminderText[reminder_type] || "Event Reminder"}
        </Heading>
        <Text style={text}>
          Hey {customer_name}! Just a friendly reminder about your upcoming event. Here are the details:
        </Text>
        <Hr style={hr} />

        <Text style={detailLabel}>Event Date</Text>
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
        <Text style={detailValue}>{location}</Text>

        {products && products.length > 0 && (
          <>
            <Text style={detailLabel}>Products Booked</Text>
            <Text style={detailValue}>{products.join(", ")}</Text>
          </>
        )}

        <Hr style={hr} />

        {remaining_balance > 0 ? (
          <Section style={balanceBox}>
            <Text style={balanceLabel}>Remaining Balance Due</Text>
            <Text style={balanceAmount}>${remaining_balance.toFixed(2)}</Text>
            <Text style={balanceNote}>
              This will be automatically charged before your event.
            </Text>
          </Section>
        ) : (
          <Section style={paidBox}>
            <Text style={paidText}>✓ Fully Paid — You're all set!</Text>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={text}>
          If you have any questions or need to make changes, please reply to this email or contact us directly. We look forward to making your event a success!
        </Text>
        <Text style={footer}>
          SIOTO Safety Hub · Keeping events safe and fun
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EventReminderEmail;

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
const balanceBox = { backgroundColor: "#FEF3C7", borderRadius: "8px", padding: "16px", margin: "0 0 20px" };
const balanceLabel = { fontSize: "12px", color: "#92400E", margin: "0 0 4px", fontWeight: "600" as const, textTransform: "uppercase" as const };
const balanceAmount = { fontSize: "24px", color: "#92400E", fontWeight: "bold" as const, margin: "0 0 4px" };
const balanceNote = { fontSize: "12px", color: "#B45309", margin: "0" };
const paidBox = { backgroundColor: "#D1FAE5", borderRadius: "8px", padding: "16px", margin: "0 0 20px" };
const paidText = { fontSize: "14px", color: "#065F46", fontWeight: "600" as const, margin: "0" };
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
