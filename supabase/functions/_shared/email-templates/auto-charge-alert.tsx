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

interface AutoChargeAlertEmailProps {
  customer_name: string;
  event_title: string;
  event_date: string;
  amount: number;
  success: boolean;
  error_message?: string;
}

export const AutoChargeAlertEmail = ({
  customer_name,
  event_title,
  event_date,
  amount,
  success,
  error_message,
}: AutoChargeAlertEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {success
        ? `Your card was charged $${amount.toFixed(2)} for ${event_title}`
        : `Payment failed for ${event_title}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/email-logo.png"
          width="48"
          height="48"
          alt="SIOTO"
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>
          {success ? "Payment Collected" : "Payment Failed"}
        </Heading>
        {success ? (
          <>
            <Text style={text}>
              Hey {customer_name}! The remaining balance for your upcoming event
              has been automatically charged to your card on file.
            </Text>
            <Hr style={hr} />
            <Text style={detailLabel}>Amount Charged</Text>
            <Text style={amountStyleSuccess}>${amount.toFixed(2)}</Text>
            <Text style={detailLabel}>Event</Text>
            <Text style={detailValue}>{event_title}</Text>
            <Text style={detailLabel}>Event Date</Text>
            <Text style={detailValue}>{event_date}</Text>
            <Hr style={hr} />
            <Text style={text}>
              No action is needed. We look forward to your event! If you have
              questions, reply to this email.
            </Text>
          </>
        ) : (
          <>
            <Text style={text}>
              Hey {customer_name}, we attempted to charge the remaining balance
              for your upcoming event, but the payment didn't go through.
            </Text>
            <Hr style={hr} />
            <Text style={detailLabel}>Amount</Text>
            <Text style={amountStyleFail}>${amount.toFixed(2)}</Text>
            <Text style={detailLabel}>Event</Text>
            <Text style={detailValue}>{event_title}</Text>
            <Text style={detailLabel}>Event Date</Text>
            <Text style={detailValue}>{event_date}</Text>
            {error_message && (
              <>
                <Text style={detailLabel}>Reason</Text>
                <Text style={detailValue}>{error_message}</Text>
              </>
            )}
            <Hr style={hr} />
            <Text style={text}>
              Please update your payment method or contact us as soon as possible
              to ensure your event goes smoothly. Reply to this email or call us
              directly.
            </Text>
          </>
        )}
        <Text style={footer}>
          SIOTO Safety Hub · Keeping events safe and fun
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AutoChargeAlertEmail;

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
const amountStyleSuccess = { fontSize: "28px", fontWeight: "bold" as const, color: "hsl(142, 71%, 45%)", margin: "0 0 14px" };
const amountStyleFail = { fontSize: "28px", fontWeight: "bold" as const, color: "hsl(0, 84%, 60%)", margin: "0 0 14px" };
const hr = { borderColor: "hsl(0, 0%, 88%)", margin: "20px 0" };
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
