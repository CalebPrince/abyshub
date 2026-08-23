import {
  ASSISTANT_NAME,
  CONTACT_EMAIL,
  DELIVERY_FLAT_RATE,
  FREE_DELIVERY_THRESHOLD,
  STORE_NAME,
} from "@/lib/config";
import { formatPrice } from "@/lib/money";
import { brands, categories, getFeaturedProducts, products } from "@/lib/products";
import { findProductsByName, searchProducts } from "@/lib/search";
import type { ChatContext, ChatReply, Responder } from "@/lib/chat/types";
import type { Product } from "@/lib/types";

export const GREETING: ChatReply = {
  text: `Hi, I'm ${ASSISTANT_NAME} from ${STORE_NAME}. Ask me about delivery, payment or anything on the shelves and I'll point you to it.`,
  quickReplies: [
    "How much is delivery?",
    "How can I pay?",
    "Is it real Tupperware?",
    "Talk to a person",
  ],
};

const DEFAULT_REPLIES = [
  "How much is delivery?",
  "How can I pay?",
  "What's in stock?",
  "Talk to a person",
];

const AFTER_PRODUCT_REPLIES = [
  "How much is delivery?",
  "How can I pay?",
  "Talk to a person",
];

type Rule = {
  id: string;
  /** Matched against the lowercased message. */
  test: RegExp;
  /** `named` holds any products the message referred to by name. */
  reply: (context: ChatContext, named: Product[]) => ChatReply;
};

/**
 * Ordered rules — first match wins, so the specific ones come first. Rules run
 * before the product search, which is why none of them may fire on a bare
 * product word like "chopper".
 */
const rules: Rule[] = [
  {
    id: "human",
    test: /\b(human|person|someone|agent|talk to|speak to|call|contact|complain|manager)\b/,
    reply: (context) => ({
      text: context.whatsappEnabled
        ? "Of course. Send us a message on WhatsApp and a person will pick it up, or leave your details here and we'll come back to you."
        : `Of course. Leave your details here and we'll come back to you, or email ${CONTACT_EMAIL}.`,
      handoff: true,
    }),
  },
  {
    id: "stock",
    test: /\b(in stock|stock|available|availability|sold out|out of stock|do you have any left)\b/,
    reply: (_context, named) => {
      if (named.length > 0) {
        const item = named[0];
        return {
          text: item.inStock
            ? `Yes — the ${item.name} is in stock and ships within one working day.`
            : `The ${item.name} is out of stock right now. Leave your details and we'll tell you the moment it lands.`,
          products: [item],
          quickReplies: AFTER_PRODUCT_REPLIES,
          handoff: !item.inStock,
        };
      }

      const soldOut = products.filter((product) => !product.inStock);
      return {
        text:
          soldOut.length === 0
            ? `All ${products.length} items are in stock. Here's what moves fastest:`
            : `${products.length - soldOut.length} of our ${products.length} items are in stock — only ${soldOut
                .map((product) => product.name)
                .join(" and ")} ${soldOut.length === 1 ? "is" : "are"} out. Here's what moves fastest:`,
        products: getFeaturedProducts().slice(0, 3),
        quickReplies: AFTER_PRODUCT_REPLIES,
      };
    },
  },
  {
    id: "delivery",
    test: /\b(deliver|delivery|shipping|ship|postage|dispatch|how long|when will|arrive)\b/,
    reply: () => ({
      text: `Delivery is ${formatPrice(DELIVERY_FLAT_RATE)}, and free once your basket passes ${formatPrice(
        FREE_DELIVERY_THRESHOLD
      )}. Orders confirmed before 3pm go out the same working day.`,
      quickReplies: ["How can I pay?", "What's in stock?", "Talk to a person"],
    }),
  },
  {
    id: "payment",
    test: /\b(pay|payment|card|paystack|momo|mobile money|transfer|cash|checkout|invoice|quote)\b/,
    reply: (context) => ({
      text: [
        "Three ways:",
        "• Card, bank transfer or USSD at checkout, handled by Paystack.",
        context.whatsappEnabled
          ? "• Send your basket on WhatsApp and settle when we confirm."
          : "• Send us your basket and settle when we confirm.",
        "• Ask for a quote if you're buying in bulk or for an event.",
      ].join("\n"),
      quickReplies: [
        "How much is delivery?",
        "Can I get a bulk price?",
        "Talk to a person",
      ],
    }),
  },
  {
    id: "bulk",
    test: /\b(bulk|wholesale|quantity|event|gift|gifting|reseller|discount|cheaper)\b/,
    reply: () => ({
      text: "Yes — we price bulk and event orders individually. Tell us the items and quantities and we'll come back with a figure including delivery, usually the same day.",
      handoff: true,
    }),
  },
  {
    id: "genuine",
    test: /\b(genuine|authentic|original|fake|real|warranty|guarantee|quality)\b/,
    reply: () => ({
      text: `Our Tupperware is sourced through authorised channels with the manufacturer's warranty intact, including the lifetime seal warranty. Anything faulty we replace. We also carry our own ${brands
        .filter((brand) => brand !== "Tupperware")
        .join(" and ")} range.`,
      quickReplies: ["Show me Tupperware", "What's in stock?", "Talk to a person"],
    }),
  },
  {
    id: "returns",
    test: /\b(return|refund|exchange|faulty|broken|damaged|wrong item)\b/,
    reply: () => ({
      text: "If something arrives faulty or isn't what you ordered, we replace it — tell us within a few days of delivery and we'll sort the pickup. Tupperware seals are covered by the manufacturer's warranty on top of that.",
      quickReplies: ["Talk to a person"],
    }),
  },
  {
    id: "categories",
    test: /\b(categor|shelf|shelves|what do you sell|what else|catalogue|catalog|everything)\b/,
    reply: () => ({
      text: `We keep ${products.length} things across ${categories.length} shelves: ${categories
        .map((category) => category.name)
        .join(", ")}. Tell me what you're storing and I'll point you at it.`,
      quickReplies: categories.slice(0, 3).map((category) => category.name),
    }),
  },
  {
    id: "hours",
    test: /\b(open|hours|when are you|closing|weekend|sunday)\b/,
    reply: () => ({
      text: "Messages come through any time and we reply during working hours, Monday to Saturday. Orders confirmed before 3pm are dispatched the same working day.",
      quickReplies: ["Talk to a person"],
    }),
  },
  {
    id: "order-status",
    test: /\b(my order|order status|tracking|track|where is my|already ordered|reference)\b/,
    reply: () => ({
      text: "I can't look up an order from here. Send us your order reference and a person will check it for you.",
      handoff: true,
    }),
  },
  {
    id: "greeting",
    test: /^(hi|hey|hello|good (morning|afternoon|evening)|yo|sup)\b/,
    reply: () => ({
      text: "Hello — what are you looking for?",
      quickReplies: DEFAULT_REPLIES,
    }),
  },
  {
    id: "thanks",
    test: /\b(thanks|thank you|cheers|nice one)\b/,
    reply: () => ({
      text: "Any time. Shout if you need anything else.",
      quickReplies: DEFAULT_REPLIES,
    }),
  },
];

/** Words that carry no product meaning, stripped before searching. */
const STOP_WORDS = new Set([
  "a", "an", "and", "any", "are", "buy", "can", "do", "does", "find", "for",
  "get", "got", "have", "how", "i", "is", "it", "looking", "me", "much", "my",
  "need", "of", "or", "show", "some", "something", "that", "the", "to", "want",
  "what", "which", "with", "you", "your",
]);

function productQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .join(" ");
}

function asksPrice(input: string): boolean {
  return /\b(price|cost|how much|charge|going for)\b/.test(input);
}

function productReply(matches: Product[], message: string): ChatReply {
  if (matches.length === 1) {
    const item = matches[0];
    const lead = asksPrice(message)
      ? `The ${item.name} is ${formatPrice(item.price)}.`
      : `Here's the ${item.name}.`;

    return {
      text: item.inStock ? lead : `${lead} It's out of stock at the moment.`,
      products: matches,
      quickReplies: AFTER_PRODUCT_REPLIES,
    };
  }

  return {
    text: `Found ${matches.length} that fit:`,
    products: matches,
    quickReplies: AFTER_PRODUCT_REPLIES,
  };
}

export const scriptedResponder: Responder = (input, context) => {
  const message = input.toLowerCase().trim();

  if (!message) {
    return {
      text: "Ask me anything about the shop.",
      quickReplies: DEFAULT_REPLIES,
    };
  }

  const query = productQuery(message);
  // Products named outright — passed to the rules so "is the chopper in stock"
  // can answer about that item rather than the shop in general.
  const named = query ? findProductsByName(query) : [];

  for (const rule of rules) {
    if (rule.test.test(message)) return rule.reply(context, named);
  }

  if (named.length > 0) return productReply(named, message);

  const brand = brands.find((candidate) =>
    message.includes(candidate.toLowerCase())
  );
  if (brand) {
    const stock = products.filter((product) => product.brand === brand);
    return {
      text: `We carry ${stock.length} ${brand} ${stock.length === 1 ? "item" : "items"}. A few of them:`,
      products: stock.slice(0, 3),
      quickReplies: AFTER_PRODUCT_REPLIES,
    };
  }

  // Last resort: every term has to appear somewhere in the product, which
  // catches things named in a description rather than a title ("beans").
  const loose = query ? searchProducts(query) : [];
  if (loose.length > 0) return productReply(loose, message);

  return {
    text: "I didn't catch that one. I can help with delivery, payment, brands and finding something on the shelves — or put you through to a person.",
    quickReplies: DEFAULT_REPLIES,
  };
};
