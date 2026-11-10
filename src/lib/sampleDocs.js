/**
 * Kagaz — sample documents for the demo and the test suite.
 *
 * ALL personal data below is synthetic and fake (generated to pass the
 * checksum validators so the redaction tests exercise the real paths):
 * the Aadhaar number is Verhoeff-valid by construction, the PAN uses a
 * valid entity letter, the card number is Luhn-valid, the phone is a
 * plausible Indian mobile. None of these belong to a real person.
 * Do not treat any of them as real credentials or identifiers.
 */

import { verhoeffCheckDigit } from './redact.js';

const aadhaarBase = '23456789012';
export const SAMPLE_AADHAAR = aadhaarBase + verhoeffCheckDigit(aadhaarBase);

export const SAMPLE_DOCS = [
  {
    id: 'offer-letter',
    title: 'Sample: Job offer letter',
    text: `OFFER OF EMPLOYMENT

Dear Aarav Sharma,

We are pleased to offer you the position of Full Stack Developer at Northwind Labs, starting 15 December 2026. Your annual compensation is Rs 12,00,000, paid monthly.

Please confirm acceptance by 01 December 2026 by replying to hr@northwindlabs.example. For queries, call our HR desk on +91 98765 43210.

Candidate details on file:
Name: Aarav Sharma
Email: aarav.sharma@example.com
Phone: 9876543210
Aadhaar: ${SAMPLE_AADHAAR}
PAN: BQXPK1234A
Date of Birth: 17 April 2003

Please submit your signed offer, a copy of your PAN card, and your bank details (UPI: aarav@okhdfcbank) before your joining date.

Welcome aboard!
Northwind Labs HR`,
  },
  {
    id: 'visa-letter',
    title: 'Sample: Visa invitation letter',
    text: `INVITATION LETTER — BUSINESS VISA

To the Visa Officer,
Indian Consulate, Mumbai.

I, Priya Nair, invite my colleague Rohan Mehta (Passport No: J1234567) to visit our office in Pune from 05 January 2027 to 20 January 2027 for a project kickoff.

Contact details:
Priya Nair — priya.nair@example.org, +91 98111 22334
Rohan Mehta — rohan.mehta@example.com

Accommodation is arranged at the company guest house. The host company will cover all local expenses. Card on file for incidentals: 4111 1111 1111 1111.

Please grant a single-entry business visa for the stated period.

Regards,
Priya Nair
Operations Lead`,
  },
];
