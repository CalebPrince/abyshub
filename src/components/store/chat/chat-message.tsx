"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-provider";
import { formatPrice } from "@/lib/money";
import { ASSISTANT_NAME } from "@/lib/config";
import type { ChatMessage as Message } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

export function ChatMessage({
  message,
  onQuickReply,
}: {
  message: Message;
  onQuickReply: (text: string) => void;
}) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isAssistant ? "items-start" : "items-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] px-3.5 py-2.5 text-sm whitespace-pre-line",
          isAssistant
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {message.text}
      </div>

      {message.products && message.products.length > 0 && (
        <ul className="w-full space-y-2">
          {message.products.map((product) => (
            <ChatProduct key={product.id} product={product} />
          ))}
        </ul>
      )}

      {message.quickReplies && message.quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => onQuickReply(reply)}
              className="border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background cursor-pointer border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatProduct({ product }: { product: NonNullable<Message["products"]>[number] }) {
  const { addItem } = useCart();

  return (
    <li className="border-foreground/12 flex items-center gap-3 border p-2">
      <Link
        href={`/products/${product.slug}`}
        className="bg-muted relative size-12 shrink-0 overflow-hidden"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="48px"
          className="object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${product.slug}`}
          className="block truncate text-xs font-semibold hover:underline"
        >
          {product.name}
        </Link>
        <p className="text-muted-foreground text-xs tabular-nums">
          {formatPrice(product.price)}
        </p>
      </div>

      {product.inStock ? (
        <Button size="sm" onClick={() => addItem(product.id)}>
          Add
        </Button>
      ) : (
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Sold out
        </span>
      )}
    </li>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5" aria-live="polite">
      <span className="sr-only">{ASSISTANT_NAME} is typing</span>
      <div className="bg-muted flex gap-1 px-3.5 py-3" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
            style={{ animationDelay: `${dot * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
