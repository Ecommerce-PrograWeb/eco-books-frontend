"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import styles from "./payment.module.css";
import { getApiBase, jsonFetch } from "../lib/api";

interface CartItem {
  book_id: number;
  name: string;
  purchase_price: number;
  quantity: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [method, setMethod] = useState("tarjeta");
  const [name, setName] = useState("");
  const [card, setCard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          const total = parsed.reduce(
            (sum: number, it: CartItem) => sum + it.purchase_price * it.quantity,
            0
          );
          setSubtotal(total);
        }
      }
    } catch {
      setItems([]);
    }
  }, []);

  const handlePayment = async () => {
    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    if (method === "tarjeta" && (!name || !card)) {
      setError("Por favor completa los datos de la tarjeta.");
      return;
    }

    try {
      setBusy(true);
      const API = getApiBase();

      const itemsPayload = items.map(it => ({
        book_id: it.book_id,
        price: it.purchase_price,
        quantity: it.quantity,
      }));

      await jsonFetch(`${API}/order/checkout`, {
        method: "POST",
        body: JSON.stringify({
          items: itemsPayload,
          total: subtotal,
          method,
        }),
      });

      localStorage.setItem("cart", JSON.stringify([]));
      const orderNumber = Date.now().toString().slice(-6);
      router.push(`/thankyou?order=${orderNumber}`);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al procesar el pago.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <main className={styles.wrapper}>
        <h1 className={styles.title}>Pago</h1>

        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.form}>
          <label className={styles.label}>
            Método de pago:
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className={styles.select}
            >
              <option value="tarjeta">Tarjeta de crédito/débito</option>
              <option value="efectivo">Efectivo (contra entrega)</option>
            </select>
          </label>

          {method === "tarjeta" && (
            <>
              <label className={styles.label}>
                Nombre en la tarjeta:
                <input
                  type="text"
                  className={styles.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ejemplo: Juan Pérez"
                />
              </label>
              <label className={styles.label}>
                Número de tarjeta:
                <input
                  type="text"
                  className={styles.input}
                  value={card}
                  onChange={e => setCard(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </label>
            </>
          )}

          <div className={styles.summary}>
            <strong>Total a pagar: Q{subtotal.toFixed(2)}</strong>
          </div>

          <button
            onClick={handlePayment}
            disabled={busy}
            className={styles.payBtn}
          >
            {busy ? "Procesando..." : "Confirmar pago"}
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}
