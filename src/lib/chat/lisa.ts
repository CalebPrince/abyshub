import "server-only";

import type { ToolDeclaration, ToolExecutor } from "@/lib/ai/engine";
import { getCatalogue, featuredFrom } from "@/lib/shop/catalogue";
import { getShopSettings } from "@/lib/shop/settings";
import { formatPrice } from "@/lib/money";
import { ASSISTANT_NAME, STORE_NAME } from "@/lib/config";
import type { Product } from "@/lib/types";

/**
 * Lisa's brain, defined once.
 *
 * Every channel she speaks on reads from here — the storefront widget, and
 * the WhatsApp agent ElevenLabs hosts. That is the whole point of the
 * arrangement: ElevenLabs runs its own conversation loop on its own servers,
 * so the only way its answers stay in step with this shop is for it to fetch
 * this prompt and call these tools rather than work from a copy pasted into
 * its dashboard, which goes stale the first time a price changes.
 *
 * The prompt names no prices or stock. Everything factual comes back through
 * a tool, because a model asked to remember a catalogue will confidently
 * invent the one item it cannot recall.
 */

const MAX_TOOL_PRODUCTS = 6;

/** What the model is allowed to see about a product. */
function summarise(product: Product) {
  return {
    name: product.name,
    brand: product.brand,
    price: formatPrice(product.price),
    in_stock: product.inStock,
    category: product.category,
    url: `/products/${product.slug}`,
  };
}

/**
 * Whether a caller ID belongs to the shop's owner.
 *
 * Compared on digits alone, because the same person arrives as "+233…" from
 * one place and "233…" from another. An unset owner number matches nobody —
 * the empty string must never be treated as a wildcard, or every anonymous
 * caller becomes the owner.
 */
export async function isOwner(callerPhone: string): Promise<boolean> {
  const digits = callerPhone.replace(/\D/g, "");
  if (!digits) return false;

  const { owner } = await getShopSettings();
  return [owner.whatsapp, owner.phone].some(
    (known) => known.length > 0 && known === digits
  );
}

export async function buildSystemPrompt(
  options: { callerPhone?: string } = {}
): Promise<string> {
  const [{ products, categories }, settings] = await Promise.all([
    getCatalogue(),
    getShopSettings(),
  ]);

  const owner = options.callerPhone ? await isOwner(options.callerPhone) : false;

  const inStock = products.filter((product) => product.inStock).length;
  const brands = [...new Set(products.map((product) => product.brand))];

  return [
    `You are ${ASSISTANT_NAME}, the assistant for ${STORE_NAME}, a shop in Ghana selling genuine Tupperware, home goods and personal care.`,
    "",
    // The owner gets a different register, not the customer one with a
    // correction bolted on afterwards. Telling a model to speak like a shop
    // assistant and then telling it not to leaves both instructions in play,
    // and which one wins is a coin toss decided per reply.
    ...(owner
      ? speakingToTheOwner(settings.owner.name)
      : [
          "HOW YOU SPEAK",
          "- Like a knowledgeable shop assistant: warm, brief, never breathless. Two or three sentences is usually plenty.",
          "- Plain British English. No emoji, no exclamation marks, no sales patter.",
          "- If someone writes in Twi, Ga or Pidgin, answer in the same register but keep product names in English.",
        ]),
    "",
    "WHAT YOU MUST NOT DO",
    "- Never state a price, a stock level or a product detail you have not just read from a tool. If a tool did not tell you, say you will check.",
    "- Never invent a product. The catalogue is exactly what search_products returns and nothing else.",
    "- Never promise a delivery date, a discount, or that something can be reserved. You do not have that authority.",
    "- Never ask for card details, and never take a payment in chat. Point people at checkout on the website.",
    "",
    "WHAT YOU KNOW WITHOUT ASKING",
    `- The shop carries ${products.length} items across ${categories.length} categories, ${inStock} of them in stock right now.`,
    `- Brands: ${brands.join(", ")}.`,
    `- Delivery is ${formatPrice(settings.deliveryFlatRate)}, free once the basket passes ${formatPrice(settings.freeDeliveryThreshold)}.`,
    "- Orders confirmed before 3pm go out the same working day.",
    "- Payment is by card, bank transfer, mobile money or USSD at checkout, through Paystack. Bulk and event orders are quoted individually.",
    "- Tupperware carries the manufacturer's warranty, including the lifetime seal warranty. Anything faulty is replaced.",
    `- People can reach a person at ${settings.contactEmail}${settings.whatsappEnabled ? ` or on WhatsApp at ${settings.whatsappNumber}` : ""}.`,
    "",
    // The owner is the person a handoff hands over *to*. Offering to fetch her
    // a member of staff is the single most obvious way for Lisa to reveal she
    // has not registered who she is talking to.
    ...(owner
      ? [
          "WHAT YOU CANNOT DO FOR HER",
          "- You see only the public catalogue. Orders, customers, takings and behind-the-scenes stock are invisible to you — say so plainly and point at the admin pages rather than estimating.",
          "- You cannot change a price, cancel or edit an order, or message a customer. If she asks, say so rather than agreeing and doing nothing.",
          "- Never call request_human. She is the person it would fetch.",
        ]
      : [
          "WHEN TO HAND OVER",
          "Call request_human when someone asks for a bulk or event quote, wants to change or chase an order, has a complaint, or asks anything about their own account or payment. Say plainly that you are passing them to a person — do not pretend to have done it yourself.",
        ]),
  ].join("\n");
}

/**
 * How Lisa speaks to the owner.
 *
 * This replaces the shop-assistant register rather than qualifying it. She is
 * not selling to the person who owns the stock, and a prompt that says "be a
 * shop assistant" and then "but not with her" leaves the model arbitrating
 * between two live instructions every turn.
 *
 * It says who she is talking to and never how that was decided: the owner's
 * numbers stay in settings and out of every prompt, so no amount of asking
 * gets Lisa to read her mobile back to a customer.
 *
 * It grants no authority either. Lisa can see exactly what she could before,
 * and the honest answer to "how did we do this week" is still that she cannot
 * see it — an owner confidently told invented figures about her own shop is
 * worse served than one told to go and look.
 */
function speakingToTheOwner(name: string): string[] {
  const who = name ? `${name}, who owns the shop` : "the shop's owner";

  return [
    "WHO YOU ARE TALKING TO",
    `- This is ${who}, not a customer. Use her name the first time and speak to her as a colleague: short, direct, and willing to say plainly when something is not right.`,
    "- No pitching, no sales patter, no explaining the delivery charge or the warranty back to her — she set them. Do not offer to pass her to a person.",
    "- Plain British English. No emoji, no exclamation marks.",
    "- If she writes in Twi, Ga or Pidgin, answer in the same register but keep product names in English.",
  ];
}

export const toolDeclarations: ToolDeclaration[] = [
  {
    name: "search_products",
    description:
      "Search the shop's catalogue by name, brand, category or purpose. Use for any question about what is sold, what something costs, or whether it is in stock. Returns nothing if there is no match — say so rather than guessing.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What the customer is after, in their own words: 'lunch box', 'Tupperware seals', 'something for rice'.",
        },
        in_stock_only: {
          type: "boolean",
          description: "Limit to items available now. Default false.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_delivery_terms",
    description:
      "The current delivery charge, the basket total that earns free delivery, and dispatch timing. Read this rather than quoting a figure from memory — the shop changes it.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "recommend_products",
    description:
      "A short list of what the shop would put in front of someone with no particular request yet — featured items first, then whatever is in stock.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "request_human",
    description:
      "Flag that this conversation needs a person: bulk quotes, order changes, complaints, anything about a specific customer's account or payment. Call it once, then tell the customer someone will pick it up.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "One line on what they need, for the staff picking it up.",
        },
      },
      required: ["reason"],
    },
  },
];

export type LisaToolContext = {
  /** Set when request_human fires, so the caller can flag the session. */
  onHandoff?: (reason: string) => void;
};

/**
 * Runs a tool by name. Shared by every channel — the widget's route handler
 * and the ElevenLabs tool webhook both dispatch here, so a fix lands in one
 * place rather than two that only get compared when one is already wrong.
 */
export function createToolExecutor(context: LisaToolContext = {}): ToolExecutor {
  return async (name, args) => {
    if (name === "search_products") {
      const query = String(args.query ?? "").toLowerCase().trim();
      const stockOnly = args.in_stock_only === true;
      const { products } = await getCatalogue();

      const words = query.split(/\s+/).filter(Boolean);
      const scored = products
        .filter((product) => (stockOnly ? product.inStock : true))
        .map((product) => {
          const haystack = [
            product.name,
            product.brand,
            product.category,
            ...(product.highlights ?? []),
          ]
            .join(" ")
            .toLowerCase();
          const score = words.filter((word) => haystack.includes(word)).length;
          return { product, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_TOOL_PRODUCTS);

      return {
        found: scored.length,
        products: scored.map((entry) => summarise(entry.product)),
      };
    }

    if (name === "get_delivery_terms") {
      const settings = await getShopSettings();
      return {
        delivery_charge: formatPrice(settings.deliveryFlatRate),
        free_delivery_over: formatPrice(settings.freeDeliveryThreshold),
        dispatch: "Orders confirmed before 3pm go out the same working day.",
        nationwide: true,
      };
    }

    if (name === "recommend_products") {
      const { products } = await getCatalogue();
      const picks = [
        ...featuredFrom(products),
        ...products.filter((product) => product.inStock),
      ]
        .filter((product, i, all) => all.findIndex((p) => p.id === product.id) === i)
        .slice(0, MAX_TOOL_PRODUCTS);

      return { products: picks.map(summarise) };
    }

    if (name === "request_human") {
      const reason = String(args.reason ?? "").slice(0, 500);
      context.onHandoff?.(reason);
      return {
        ok: true,
        note: "A member of staff has been flagged. Tell the customer someone will pick this up.",
      };
    }

    return { error: `Unknown tool ${name}.` };
  };
}
