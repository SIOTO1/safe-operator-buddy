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

interface PaymentReceiptEmailProps {
  customer_name: string;
  amount: number;
  payment_type: string;
  event_title: string;
  event_date: string;
  transaction_id?: string;
}

export const PaymentReceiptEmail = ({
  customer_name,
  amount,
  payment_type,
  event_title,
  event_date,
  transaction_id,
}: PaymentReceiptEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — ${amount.toFixed(2)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/logo-1773269498760.png"
          width="48"
          height="48"
          alt="SIOTO"
          style={{ marginBottom: "24px" }}
        />
        <Heading style={h1}>Payment Received</Heading>
        <Text style={text}>
          Hey {customer_name}! We've successfully processed your payment. Here
          are the details:
        </Text>
        <Hr style={hr} />
        <Text style={detailLabel}>Amount</Text>
        <Text style={amountStyle}>${amount.toFixed(2)}</Text>
        <Text style={detailLabel}>Payment Type</Text>
        <Text style={detailValue}>
          {payment_type === "deposit" ? "Deposit" : payment_type === "auto_balance" ? "Remaining Balance (Auto)" : "Payment"}
        </Text>
        <Text style={detailLabel}>Event</Text>
        <Text style={detailValue}>{event_title}</Text>
        <Text style={detailLabel}>Event Date</Text>
        <Text style={detailValue}>{event_date}</Text>
        {transaction_id && (
          <>
            <Text style={detailLabel}>Transaction ID</Text>
            <Text style={{ ...detailValue, fontFamily: "Courier, monospace", fontSize: "12px" }}>
              {transaction_id}
            </Text>
          </>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Thank you for your payment! If you have questions about this charge,
          just reply to this email.
        </Text>
        <Text style={footer}>
          SIOTO Safety Hub · Keeping events safe and fun
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PaymentReceiptEmail;

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
const amountStyle = { fontSize: "28px", fontWeight: "bold" as const, color: "hsl(24, 95%, 53%)", margin: "0 0 14px" };
const hr = { borderColor: "hsl(0, 0%, 88%)", margin: "20px 0" };
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
