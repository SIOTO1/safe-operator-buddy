/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface TeamInviteEmailProps {
  companyName: string
  role: string
  inviteUrl: string
  invitedByName: string
}

export const TeamInviteEmail = ({
  companyName,
  role,
  inviteUrl,
  invitedByName,
}: TeamInviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://atdpdxocpjnldajapjyp.supabase.co/storage/v1/object/public/logos/logo-1773269498760.png"
          width="48"
          height="48"
          alt={companyName}
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>You're invited to join {companyName}</Heading>
        <Text style={text}>
          {invitedByName} has invited you to join <strong>{companyName}</strong> as a <strong>{role}</strong>.
        </Text>
        <Text style={text}>
          Click the button below to create your account and get started.
        </Text>
        <Button style={button} href={inviteUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          This invitation link will expire in 7 days. If you weren't expecting this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default TeamInviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  fontFamily: "'Space Grotesk', Arial, sans-serif",
  color: 'hsl(0, 0%, 8%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(0, 0%, 40%)',
  lineHeight: '1.6',
  margin: '0 0 15px',
}
const button = {
  backgroundColor: 'hsl(24, 95%, 53%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
