import type { DemoCase } from "@/types/scamshield";

export const DEMO_CASES: DemoCase[] = [
  {
    id: "job-scam",
    label: "Fake Job / Task Scam",
    tag: "WhatsApp Trap",
    channel: "job_offer",
    senderInfo: "+44 7418 902114 (Unknown HR)",
    message:
      "Hello! Selected for Amazon Part-Time Online Review Team. Earn ₹3,500 to ₹8,000 daily from home just liking YouTube videos! Join our Telegram @vip_hr_tasks now. Pay a ₹999 refundable security deposit via UPI to unlock VIP prepaid tasks and double your return immediately.",
  },
  {
    id: "kyc-sms",
    label: "Urgent Bank KYC Freeze",
    tag: "Phishing SMS",
    channel: "sms",
    senderInfo: "AD-SBIALR",
    message:
      "DEAR CUSTOMER: Your SBI YONO banking account will be BLOCKED tonight at 11:59 PM due to incomplete PAN KYC! Update immediately at http://bit.ly/sbi-kyc-verify-now within 2 hours or lose access. Share your OTP on call if verification fails.",
  },
  {
    id: "upi-qr",
    label: "UPI QR / Refund Trick",
    tag: "Payment Fraud",
    channel: "upi",
    senderInfo: "OLX Buyer (Rahul)",
    message:
      "Bhai I accidentally sent ₹12,500 on GPay instead of ₹1,250 for your laptop! Please scan this QR code and enter your UPI PIN quickly so ₹2,000 advance is credited to your bank account right now.",
  },
  {
    id: "legit-parcel",
    label: "Genuine Delivery Alert",
    tag: "Safe Control",
    channel: "sms",
    senderInfo: "BLUDRT",
    message:
      "Your BlueDart prepaid shipment #BD8841290 is out for delivery today between 2 PM and 5 PM. Track status in the official BlueDart app or https://www.bluedart.com. No payment is required at delivery.",
  },
];
