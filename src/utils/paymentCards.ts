// ==========================================
// DYNAMIC PAYMENT CHANNELS & WEBSITE BRANDING
// ==========================================

export interface PaymentCardDetail {
  label: string;
  value: string;
}

export interface PaymentCard {
  id: 'airtm' | 'wise' | 'upi';
  title: string;
  description: string;
  badge?: string;
  details: PaymentCardDetail[];
  whatsappMessage: string;
}

export function getDynamicPaymentCards(businessName: string = "My Workspace"): PaymentCard[] {
  return [
    {
      id: "airtm",
      title: "Airtm - Global Recommended",
      description: "Airtm Wallet - Worldwide Accepted",
      badge: "Recommended",
      details: [
        {
          label: "Beneficiary",
          value: businessName
        },
        {
          label: "Payment Details",
          value: "Contact on WhatsApp / Email for Airtm ID"
        }
      ],
      whatsappMessage: `Hello, I need the Airtm payment details for ${businessName}.`
    },
    {
      id: "wise",
      title: "Wise - For USA / UK / EU",
      description: "Wise Transfer - USD / GBP / EUR Accepted",
      badge: "USD / GBP / EUR",
      details: [
        {
          label: "Payment Details",
          value: "Contact on WhatsApp / Email for Wise Details"
        }
      ],
      whatsappMessage: `Hello, I need the Wise transfer details for ${businessName}.`
    },
    {
      id: "upi",
      title: "UPI - For India",
      description: "UPI / IMPS / India Bank Transfer",
      badge: "INR / IMPS",
      details: [
        {
          label: "Payment Details",
          value: "Contact on WhatsApp / Email for UPI ID"
        }
      ],
      whatsappMessage: `Hello, I need the UPI payment details for ${businessName}.`
    }
  ];
}

export const paymentCards: PaymentCard[] = getDynamicPaymentCards();

export const oldPaymentMethods = [
  "Easypaisa",
  "JazzCash",
  "Meezan Bank"
];

export function getWhatsAppLink(message: string = "", phone?: string): string {
  const targetPhone = phone || "15550192834";
  const number = targetPhone.replace(/\D/g, "").replace(/^0/, "92");
  return `https://wa.me/${number || "923001234567"}?text=${encodeURIComponent(message)}`;
}
