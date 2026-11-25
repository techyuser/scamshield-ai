import { RedFlagItem, ReplyLanguage, ScamVerdict } from "@/types/scamshield";

export interface LocalizedGuidance {
  headline: string;
  plainEnglishSummary: string;
  doNotDo: string[];
  safeNextSteps: string[];
  safeReplyDraft: string;
}

const HINDI_SAFE_GUIDANCE: LocalizedGuidance = {
  headline: "सुरक्षित संदेश: कोई ठगी का संकेत नहीं मिला।",
  plainEnglishSummary:
    "इस संदेश में पैसे मांगने, संदिग्ध लिंक या OTP का कोई जाल नहीं मिला। फिर भी पुष्टि के लिए हमेशा आधिकारिक ऐप का ही उपयोग करें।",
  doNotDo: [
    "डिलीवरी लेने से पहले अनजान व्यक्तियों को अनावश्यक OTP या बैंक विवरण साझा न करें।",
  ],
  safeNextSteps: [
    "संदेह होने पर ऑर्डर की स्थिति सीधे आधिकारिक कंपनी के ऐप में जांचें।",
  ],
  safeReplyDraft:
    "अपडेट के लिए धन्यवाद। मैं आधिकारिक ऐप के माध्यम से डिलीवरी ट्रैक कर लूंगा।",
};

const ENGLISH_SAFE_GUIDANCE: LocalizedGuidance = {
  headline: "Looks Safe: Normal notification with zero scam red flags.",
  plainEnglishSummary:
    "No hidden money trap, OTP ask, or suspicious link was detected. Still, always open official apps directly when tracking deliveries.",
  doNotDo: [
    "Avoid sharing OTPs with anyone unless you are physically receiving a verified parcel.",
  ],
  safeNextSteps: [
    "Check order status directly inside the official brand app if you want extra certainty.",
    "Keep prepaid order tracking codes private until delivery.",
  ],
  safeReplyDraft: "Thank you for the update. I will track the delivery on the official app.",
};

/**
 * Returns plain-language safety guidance and reply templates in English or Hindi.
 */
export function buildLocalizedGuidance(
  verdict: ScamVerdict,
  scamCategory: string,
  redFlags: RedFlagItem[],
  lang: ReplyLanguage
): LocalizedGuidance {
  if (lang === "hi") {
    if (verdict === "LOOKS_SAFE") return HINDI_SAFE_GUIDANCE;

    return {
      headline:
        verdict === "CRITICAL_SCAM"
          ? `खतरा: यह एक ${scamCategory} है।`
          : "सावधान: संदिग्ध और दबाव बनाने वाले संकेत मिले हैं।",
      plainEnglishSummary:
        verdict === "CRITICAL_SCAM"
          ? "पैसे न भेजें, किसी लिंक पर क्लिक न करें और UPI PIN या OTP साझा न करें। यह संदेश आपको जल्दी में फंसाने की कोशिश कर रहा है।"
          : "यह संदेश संदिग्ध प्रतीत होता है। कोई भी कदम उठाने से पहले आधिकारिक ऐप या हेल्पलाइन से स्वयं जांच करें।",
      doNotDo: [
        "किसी भी अनजान या शॉर्ट लिंक (bit.ly आदि) पर क्लिक न करें।",
        "पैसे 'प्राप्त' करने के लिए कभी भी QR स्कैन न करें या UPI PIN न डालें।",
        "कोई रजिस्ट्रेशन फीस, सिक्योरिटी डिपॉजिट या OTP साझा न करें।",
      ],
      safeNextSteps: [
        "WhatsApp या SMS में इस नंबर को तुरंत ब्लॉक और रिपोर्ट करें।",
        "बैंक KYC या ऑर्डर जांचने के लिए हमेशा आधिकारिक बैंक ऐप खोलें।",
        "भारत में साइबर धोखाधड़ी की रिपोर्ट cybercrime.gov.in या हेल्पलाइन 1930 पर करें।",
      ],
      safeReplyDraft:
        "मैं संदेशों के माध्यम से किसी भी लिंक पर क्लिक नहीं करता, जमा राशि नहीं भेजता, और न ही UPI PIN या OTP साझा करता हूं। कृपया दोबारा संपर्क न करें—मैं इस नंबर को ब्लॉक और रिपोर्ट कर रहा हूं।",
    };
  }

  if (verdict === "LOOKS_SAFE") return ENGLISH_SAFE_GUIDANCE;

  return {
    headline:
      verdict === "CRITICAL_SCAM"
        ? `Danger: Classic ${scamCategory} detected.`
        : "Caution: Unverified claims or pressure tactics found.",
    plainEnglishSummary:
      verdict === "CRITICAL_SCAM"
        ? `Do NOT pay, click links, or share any PIN/OTP. This message combines ${redFlags
            .slice(0, 2)
            .map((r) => r.tactic.toLowerCase())
            .join(" and ")} to steal money or credentials.`
        : "Something feels off—verify directly through the official company app or helpline before taking action.",
    doNotDo: [
      "Do NOT click any shortened or http:// links in this message.",
      "Do NOT enter your UPI PIN or scan a QR code to 'receive' money.",
      "Do NOT send any registration fee, security deposit, or OTP.",
    ],
    safeNextSteps: [
      "Block and report the sender number inside WhatsApp / SMS immediately.",
      "If checking bank KYC or an order, open your official bank/shopping app manually—never via SMS links.",
      "Report fraud attempts in India at cybercrime.gov.in or call 1930.",
    ],
    safeReplyDraft:
      "I do not click external links, pay deposits, or share UPI PINs/OTPs over messages. Please do not contact me again—this number is being blocked and reported.",
  };
}
