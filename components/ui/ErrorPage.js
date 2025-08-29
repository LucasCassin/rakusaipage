import React from "react";
import Head from "next/head";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import Button from "components/ui/Button";

export default function ErrorPage({
  errorCode,
  title,
  message,
  buttons = [],
  icon: Icon = ExclamationCircleIcon,
  iconColor = "text-rakusai-purple",
}) {
  return (
    <>
      <Head>
        <title>{`${errorCode ? `${errorCode} - ` : ""}${title} | Rakusai Taiko`}</title>
      </Head>
      <main
        className="relative min-h-screen flex items-center justify-center p-6 font-sans overflow-hidden"
        style={{ backgroundColor: "#f0f0f0" }}
      >
        {errorCode && (
          <div
            className="absolute -z-0 text-gray-200 font-black text-[20rem] md:text-[30rem] select-none"
            style={{ lineHeight: 1 }}
          >
            {errorCode}
          </div>
        )}

        <div className="relative z-10 text-center max-w-2xl bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-xl flex flex-col items-center">
          <Icon className={`h-20 w-20 mb-6 ${iconColor}`} />

          <h1 className="text-5xl font-extrabold text-rakusai-purple mb-4">
            {title}
          </h1>
          <p className="text-lg text-gray-600 mb-8">{message}</p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {buttons.map((button, index) => (
              <Button
                key={index}
                variant={button.variant}
                onClick={button.onClick}
              >
                {button.text}
              </Button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
