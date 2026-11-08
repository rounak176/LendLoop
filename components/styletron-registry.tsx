"use client";

import { BaseProvider, createTheme } from "baseui";
import { Client, Server } from "styletron-engine-atomic";
import { Provider as StyletronProvider } from "styletron-react";
import { useServerInsertedHTML } from "next/navigation";
import { useState, type ReactNode } from "react";

const lendLoopTheme = createTheme({ primary: "#28634d" });

type StyletronEngine = Client | Server;

export function StyletronRegistry({ children }: { children: ReactNode }) {
  const [engine] = useState<StyletronEngine>(() => {
    if (typeof window === "undefined") return new Server();
    return new Client({
      hydrate: document.getElementsByClassName("styletron") as HTMLCollectionOf<HTMLStyleElement>,
    });
  });

  useServerInsertedHTML(() => {
    if (!(engine instanceof Server)) return null;

    return (
      <>
        {engine.getStylesheets().map(({ css, attrs }, index) => (
          <style
            key={`styletron-${index}`}
            {...attrs}
            className="styletron"
            dangerouslySetInnerHTML={{ __html: css }}
          />
        ))}
      </>
    );
  });

  return (
    <StyletronProvider value={engine}>
      <BaseProvider theme={lendLoopTheme}>{children}</BaseProvider>
    </StyletronProvider>
  );
}