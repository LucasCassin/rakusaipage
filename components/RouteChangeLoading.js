import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loading from "./Loading";

export default function RouteChangeLoading() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleStart = (url, { shallow }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!shallow) {
        timerRef.current = setTimeout(() => {
          setLoading(true);
        }, 150);
      }
    };

    const handleComplete = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [router]);

  return loading ? <Loading /> : null;
}
