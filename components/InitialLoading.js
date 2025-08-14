import React, { useState, useEffect } from "react";
import Loading from "./Loading";

export default function InitialLoading() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mostrar loading na primeira renderização
    // e remover após um tempo curto
    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 500); // Meio segundo é suficiente para mostrar o loading sem atrasar muito a experiência

    return () => clearTimeout(timer);
  }, []);

  return loading ? <Loading /> : null;
}
